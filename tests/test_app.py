from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from src import app as app_module


@pytest.fixture(autouse=True)
def reset_activities():
    original_activities = deepcopy(app_module.activities)
    app_module.activities.clear()
    app_module.activities.update(deepcopy(original_activities))

    try:
        yield
    finally:
        app_module.activities.clear()
        app_module.activities.update(original_activities)


@pytest.fixture
def client():
    return TestClient(app_module.app)


def test_list_activities_returns_activity_details(client):
    # Arrange
    expected_fields = {"description", "schedule", "max_participants", "participants"}

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    activities = response.json()
    assert "Chess Club" in activities
    for activity in activities.values():
        assert expected_fields <= activity.keys()
        assert isinstance(activity["participants"], list)


def test_signup_adds_participant(client):
    # Arrange
    activity_path = "/activities/Chess%20Club"
    email = "new-student@mergington.edu"

    # Act
    response = client.post(f"{activity_path}/signup", params={"email": email})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {email} for Chess Club"}
    assert email in client.get("/activities").json()["Chess Club"]["participants"]


def test_duplicate_signup_returns_400_without_adding_participant(client):
    # Arrange
    activity_path = "/activities/Chess%20Club"
    email = "michael@mergington.edu"

    # Act
    response = client.post(f"{activity_path}/signup", params={"email": email})

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Student is already signed up"
    participants = client.get("/activities").json()["Chess Club"]["participants"]
    assert participants.count(email) == 1


def test_signup_for_missing_activity_returns_404(client):
    # Arrange
    email = "new-student@mergington.edu"

    # Act
    response = client.post(
        "/activities/Missing%20Club/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_removes_participant(client):
    # Arrange
    activity_path = "/activities/Chess%20Club/participants"
    email = "michael@mergington.edu"

    # Act
    response = client.delete(activity_path, params={"email": email})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Unregistered {email} from Chess Club"}
    assert email not in client.get("/activities").json()["Chess Club"]["participants"]


def test_unregister_from_missing_activity_returns_404(client):
    # Arrange
    email = "new-student@mergington.edu"

    # Act
    response = client.delete(
        "/activities/Missing%20Club/participants",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_missing_participant_returns_404(client):
    # Arrange
    activity_path = "/activities/Chess%20Club/participants"
    email = "not-signed-up@mergington.edu"

    # Act
    response = client.delete(activity_path, params={"email": email})

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not signed up for this activity"