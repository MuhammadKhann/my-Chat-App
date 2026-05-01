const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            family: 4,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log("✅ MongoDB Connected Successfully!");
    } catch (err) {
        console.error("❌ Critical MongoDB Connection Error:", err);
        process.exit(1);
    }
};

mongoose.connection.on('error', err => {
    console.error("⚠️ MongoDB Network Error after initial connection:", err);
});

module.exports = connectDB;
