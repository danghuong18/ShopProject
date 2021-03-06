const mongoose = require("./dbConnect");

const GENDERS = ["male", "female"];
const ROLES = ["user", "admin"];

const UserSchema = mongoose.Schema(
  {
    username: { type: String, require: true },
    password: { type: String, require: true },
    fullName: String,
    email: String,
    phone: String,
    gender: {
      type: String,
      enum: GENDERS,
      default: GENDERS[0],
    },
    DOB: Date,
    avatar: String,
    cartID: {
      type: String,
      ref: "cart",
    },
    addressList: [{ address: String, active: Boolean }],
    role: {
      type: String,
      enum: ROLES,
      default: ROLES[0],
    },
    createDate: Date,
    updateDate: Date
  },
  { collection: "user" }
);

const UserModel = mongoose.model("user", UserSchema);

module.exports = UserModel;
