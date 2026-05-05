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
  },
  { timestamps: true }
);

// ─── FIX: Mongoose 7+ async hooks must NOT use next() ────────────────────────
// When you declare `async function (next)`, Mongoose 7+ passes `undefined` for
// next and relies solely on the returned Promise. Calling next() crashes with
// "next is not a function". The correct pattern: async, no parameter, no call.
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare a plain-text candidate against the stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const UserModel = mongoose.model("UserModel", userSchema);
export default UserModel;