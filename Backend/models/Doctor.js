import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  experience: { type: Number, required: true }, // in years
  location: { type: String, required: true },
  fee: { type: Number, required: true },
  nextAvailable: { type: String, required: true }, // Can use Date type if needed
  image: { type: String }, // optional: avatar/image URL
}, { timestamps: true });

const Doctor = mongoose.model("Doctor", doctorSchema);
export default Doctor;
