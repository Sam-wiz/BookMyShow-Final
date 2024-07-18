const express = require("express");
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middlewares/authMiddleware");
const {emailSender} = require("../utils/emailSender");

const router = express.Router();

//Function for otp generation



router.post("/register", async (req, res) => {
  try {
    const userExists = await User.findOne({ email: req.body.email });
    if (userExists) {
      res.send({
        success: false,
        message: "The user already exists!",
      });
    }
    const salt = await bcrypt.genSalt(10);
    console.log(salt);
    const hashPwd = bcrypt.hashSync(req.body.password, salt);
    console.log(hashPwd);
    req.body.password = hashPwd;
    

    const newUser = await User(req.body);
    await newUser.save();
    // console.log(newUser);
    res.send({
      success: true,
      message: "You've successfully signed up, please login now!",
    });
  } catch (err) {
    console.log(err);
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      res.send({
        success: false,
        message: "user does not exist Please Register",
      });
    }

    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (!validPassword) {
      res.send({
        success: false,
        message: "Sorry, invalid password entered!",
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.secret_key_jwt, {
      expiresIn: "1d",
    });

    res.send({
      success: true,
      message: "You've successfully logged in!",
      token: token,
    });
  } catch (error) {
    console.error(error);
  }
});

// router-level-middleware

router.get("/get-current-user", authMiddleware, async (req, res) => {
  const user = await User.findById(req.body.userId).select("-password");

  res.send({
    success: true,
    message: 'You are authorized to go to the protected route!',
    data: user
   })
});

// forgot password

const otpGenerator = function () {
  return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
};

// Forgot password
router.patch("/forgetpassword", async function (req, res) {
  try {
    if (!req.body.email) {
      console.log("Email not provided");
      return res.status(401).json({
        status: "failure",
        message: "Please enter the email for forget Password"
      });
    }

    let user = await User.findOne({ email: req.body.email });
    if (!user) {
      console.log("User not found for email:", req.body.email);
      return res.status(404).json({
        status: "failure",
        message: "User not found for this email"
      });
    }

    const otp = otpGenerator();
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes
    await user.save();

    await emailSender(
      "otp.html",
      user.email,
      { name: user.name, otp: otp },
      "Your OTP for Password Reset"
    );

    res.status(200).json({
      status: "success",
      message: "OTP sent to your email",
    });
  } catch (err) {
    console.error("Error in forgetpassword route:", err);
    res.status(500).json({
      message: err.message,
      status: "failure"
    });
  }
});


// Reset password
router.patch("/resetpassword", async function (req, res) {
  try {
    let resetDetails = req.body;

    if (!resetDetails.password || !resetDetails.otp) {
      return res.status(401).json({
        status: "failure",
        message: "Invalid request, missing required fields"
      });
    }

    const user = await User.findOne({ otp: req.body.otp });

    if (!user) {
      return res.status(404).json({
        status: "failure",
        message: "User not found"
      });
    }

    if (Date.now() > user.otpExpiry) {
      return res.status(401).json({
        status: "failure",
        message: "OTP expired"
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPwd = bcrypt.hashSync(req.body.password, salt);
    user.password = hashPwd;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Password reset successfully"
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
      status: "failure"
    });
  }
});

module.exports = router;
