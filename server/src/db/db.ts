import mongoose from "mongoose";


const MONGO_URI = process.env.MONGO_URI || "";

export const startServer = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully to MongoDB");

    
  } catch (error: any) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};
