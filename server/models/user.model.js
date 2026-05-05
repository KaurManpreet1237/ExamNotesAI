import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name:             { type: String, required: true, trim: true },
    email:            { type: String, unique: true, required: true, lowercase: true, trim: true },
    password:         { type: String, default: null },
    isGoogleUser:     { type: Boolean, default: false },
    isVerified:       { type: Boolean, default: false },
    otp:              { type: String, default: null },
    otpExpiry:        { type: Date, default: null },
    otpVerified:      { type: Boolean, default: false },
    credits:          { type: Number, default: 50, min: 0 },
    isCreditAvailable:{ type: Boolean, default: true },
    notes:            { type: [mongoose.Schema.Types.ObjectId], ref: "Notes", default: [] },

    // ─── ADMIN EXTENSION ─────────────────────────────────────────────────────
    // Assigned via ADMIN_EMAIL env var only. Never changeable from frontend.
    role:       { type: String, enum: ["user", "admin"], default: "user" },
    // Total INR paid — incremented by Stripe webhook on each purchase
    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const UserModel = mongoose.model("UserModel", userSchema);
export default UserModel;
