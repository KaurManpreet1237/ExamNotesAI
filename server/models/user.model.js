import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: null,
    },
    isGoogleUser: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    credits: {
      type: Number,
      default: 50,
      min: 0,
    },
    isCreditAvailable: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Notes",
      default: [],
    },
  },
  { timestamps: true }
);

// Hash password before saving (only if password field was modified)
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Instance method: compare plain password to stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const UserModel = mongoose.model("UserModel", userSchema);

export default UserModel;
