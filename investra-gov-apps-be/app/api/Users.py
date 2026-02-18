"""
User management routes – CRUD (superadmin only).
"""

from flask import Blueprint
from app.controllers.UserController import UserController
from app.middleware.Auth import tokenRequired, roleRequired

users_bp = Blueprint("users", __name__)


@users_bp.route("/users", methods=["GET"])
@tokenRequired
@roleRequired("superadmin")
def listUsers():
    return UserController.listUsers()


@users_bp.route("/users/<string:userId>", methods=["GET"])
@tokenRequired
@roleRequired("superadmin")
def getUser(userId):
    return UserController.getUser(userId)


@users_bp.route("/users", methods=["POST"])
@tokenRequired
@roleRequired("superadmin")
def createUser():
    return UserController.createUser()


@users_bp.route("/users/<string:userId>", methods=["PUT"])
@tokenRequired
@roleRequired("superadmin")
def updateUser(userId):
    return UserController.updateUser(userId)


@users_bp.route("/users/<string:userId>", methods=["DELETE"])
@tokenRequired
@roleRequired("superadmin")
def deleteUser(userId):
    return UserController.deleteUser(userId)
