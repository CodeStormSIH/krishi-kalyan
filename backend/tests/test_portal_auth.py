"""Isolated authentication integration tests. No real SMS or database writes."""
import os
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ENVIRONMENT"] = "test"
os.environ["SECRET_KEY"] = "isolated-auth-test-key-not-used-by-the-app"

import unittest
from datetime import datetime, timedelta
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database import Base, get_db
from models import User
from routers import portal_auth as auth


class PortalAuthTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        app = FastAPI()
        app.include_router(auth.router, prefix="/api/v1/auth")
        def database():
            with self.sessions() as db:
                yield db
        app.dependency_overrides[get_db] = database
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def post(self, endpoint, body):
        return self.client.post("/api/v1/auth/portal/" + endpoint, json=body)

    def register(self):
        result = self.post("register", {"username": "test-farmer", "password": "test-password",
            "aadhaar": "000000000000", "phone": "9000000000", "email": "test@example.test"})
        self.assertEqual(result.status_code, 200, result.text)
        return result.json()

    def verify(self, challenge):
        return self.post("verify", {"challengeId": challenge["challengeId"], "otp": challenge["dev_otp"]})

    def test_farmer_signup_login_recovery_and_reset(self):
        challenge = self.register()
        self.assertEqual(self.post("login", {"username": "test-farmer", "password": "test-password"}).status_code, 401)
        response = self.verify(challenge)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["role"], "farmer")
        self.assertTrue(response.json()["access_token"])
        self.assertNotIn("password", response.json())
        self.assertEqual(self.verify(challenge).status_code, 400)
        self.assertEqual(self.post("login", {"username": "test-farmer", "password": "wrong"}).status_code, 401)
        self.assertEqual(self.post("login", {"username": "test-farmer", "password": "test-password"}).status_code, 200)
        recovered = self.post("identity", {"role": "farmer", "flow": "forgot-username", "aadhaar": "000000000000"})
        self.assertEqual(self.verify(recovered.json()).json()["username"], "test-farmer")
        reset = self.post("identity", {"role": "farmer", "flow": "forgot-password", "aadhaar": "000000000000"})
        grant = self.verify(reset.json()).json()
        self.assertIn("resetToken", grant)
        self.assertNotIn("access_token", grant)
        self.assertEqual(self.post("reset-password", {"resetToken": "fake", "password": "new-test-password"}).status_code, 400)
        changed = self.post("reset-password", {**grant, "password": "new-test-password"})
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertEqual(self.post("reset-password", {**grant, "password": "another-password"}).status_code, 400)
        self.assertEqual(self.post("login", {"username": "test-farmer", "password": "test-password"}).status_code, 401)
        self.assertEqual(self.post("login", {"username": "test-farmer", "password": "new-test-password"}).status_code, 200)
        with self.sessions() as db:
            account = db.query(auth.PortalAccount).one()
            self.assertNotEqual(account.password_hash, "new-test-password")
            self.assertNotEqual(account.aadhaar_digest, "000000000000")

    def test_staff_identity_role_binding_and_autofill(self):
        for index, role in enumerate(["admin", "operator"]):
            with self.sessions() as db:
                user = User(phone_number=f"900000000{index}", full_name="Test Staff", role=role.upper())
                db.add(user); db.commit()
                auth.provision_staff(db, user.id, f"staff-{index}", f"00000000000{index}")
            body = {"role": role, "flow": "login", "identifier": f"staff-{index}", "aadhaar": f"00000000000{index}"}
            self.assertEqual(self.post("identity", {**body, "identifier": "wrong"}).status_code, 401)
            response = self.post("identity", body)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertRegex(response.json()["dev_otp"], r"^\d{6}$")
            self.assertNotIn("phone_number", response.json())
            self.assertEqual(self.verify(response.json()).json()["role"], role)
            self.assertEqual(self.post("identity", {**body, "role": "farmer"}).status_code, 401)

    def test_otp_limits_expiry_and_resend(self):
        challenge = self.register()
        self.assertEqual(self.post("resend", {"challengeId": challenge["challengeId"]}).status_code, 429)
        wrong = "000000" if challenge["dev_otp"] != "000000" else "000001"
        for _ in range(5):
            self.assertEqual(self.post("verify", {"challengeId": challenge["challengeId"], "otp": wrong}).status_code, 400)
        self.assertEqual(self.verify(challenge).status_code, 400)
        with self.sessions() as db:
            db.get(auth.PortalChallenge, challenge["challengeId"]).resend_at = datetime.utcnow() - timedelta(seconds=1)
            db.commit()
        renewed = self.post("resend", {"challengeId": challenge["challengeId"]}).json()
        self.assertNotEqual(renewed["challengeId"], challenge["challengeId"])
        self.assertEqual(self.verify(challenge).status_code, 400)
        with self.sessions() as db:
            db.get(auth.PortalChallenge, renewed["challengeId"]).expires_at = datetime.utcnow() - timedelta(seconds=1)
            db.commit()
        self.assertEqual(self.verify(renewed).status_code, 400)

    def test_production_does_not_expose_otp(self):
        with patch.object(auth.settings, "ENVIRONMENT", "production"), patch.object(auth, "send_code", return_value=("123456", "SMS")):
            challenge = self.register()
            self.assertNotIn("dev_otp", challenge)

    def test_public_registration_cannot_create_staff(self):
        response = self.post("register", {"username": "test-farmer", "password": "test-password", "role": "ADMIN",
            "aadhaar": "000000000000", "phone": "9000000000", "email": "test@example.test"})
        self.assertEqual(self.verify(response.json()).json()["role"], "farmer")


if __name__ == "__main__":
    unittest.main()
