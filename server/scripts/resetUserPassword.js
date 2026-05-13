const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Reset password for a user by email
const resetPassword = async (email, newPassword) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      await mongoose.disconnect();
      return false;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.updateOne({ email }, { password: hashedPassword });

    console.log(`✅ Password reset successfully for: ${user.username} (${email})`);
    console.log(`   New hash prefix: ${hashedPassword.substring(0, 30)}...`);

    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Password reset failed:', error);
    process.exit(1);
  }
};

// Verify password for a user
const verifyPassword = async (email, testPassword) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      await mongoose.disconnect();
      return null;
    }

    const isMatch = await bcrypt.compare(testPassword, user.password);

    console.log(`📊 Password verification for: ${user.username} (${email})`);
    console.log(`   Password matches: ${isMatch}`);
    console.log(`   Hash prefix: ${user.password.substring(0, 30)}...`);
    console.log(`   Test password length: ${testPassword.length}`);

    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    return isMatch;
  } catch (error) {
    console.error('❌ Password verification failed:', error);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  const email = args[1];
  const password = args[2];

  if (!command || !email) {
    console.log('Usage:');
    console.log('  node resetUserPassword.js reset <email> <newPassword>');
    console.log('  node resetUserPassword.js verify <email> <testPassword>');
    console.log('');
    console.log('Examples:');
    console.log('  node resetUserPassword.js reset user@example.com MyNewPass123');
    console.log('  node resetUserPassword.js verify user@example.com MyCurrentPass');
    process.exit(1);
  }

  switch (command) {
    case 'reset':
      if (!password) {
        console.log('❌ Please provide a new password');
        process.exit(1);
      }
      await resetPassword(email, password);
      break;
    case 'verify':
      if (!password) {
        console.log('❌ Please provide a password to test');
        process.exit(1);
      }
      const result = await verifyPassword(email, password);
      process.exit(result ? 0 : 1);
    default:
      console.log(`❌ Unknown command: ${command}`);
      process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { resetPassword, verifyPassword };
