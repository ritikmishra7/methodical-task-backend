const asyncHandler = require("express-async-handler");
const JWT = require("@configs/jwt");
const User = require("@models/user");
const Project = require("@models/project");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL_ID,
		pass: process.env.EMAIL_PASSWORD
	}
});

exports.login = asyncHandler(async (req, res) =>
{
	let responseObject = {};

	const { email, password } = req.body;

	const user = await User.findOne({ email: email.trim() });

	if (!user)
	{
		responseObject.code = 404;
		responseObject.message = "User not found";

		return res.success(responseObject);
	}

	if (user.authenticate(password))
	{
		delete user.salt;
		delete user.encrypted_password;
		delete user.status;

		const accessToken = JWT.generate(user, "15m");
		const refreshToken = JWT.generate(user, "8h");

		res.cookie('jwt', refreshToken, {
			httpOnly: true,
			secure: true,
			sameSite: "none"
		},);

		responseObject.message = "Successfully logged in";
		responseObject.result = { accessToken };

		return res.success(responseObject);
	}
	else
	{
		responseObject.message = "Wrong password";

		return res.error(responseObject);
	}
});

exports.register = asyncHandler(async (req, res) =>
{
	let responseObject = {};

	const requestBody = req.body;
	let user = await User.findOne({ email: requestBody.email.trim() });

	if (user)
	{
		responseObject.code = 403;
		responseObject.message = "This email is already registered, please try logging in!";

		return res.error(responseObject);
	}

	let result = await User.create(requestBody);

	responseObject.message = "You have successfully registered!";

	delete result.salt;
	delete result.encrypted_password;
	delete result.status;

	const accessToken = JWT.generate(result, "15m");
	const refreshToken = JWT.generate(result, "8h");

	res.cookie('jwt', refreshToken, {
		httpOnly: true,
		secure: true,
		sameSite: "none"
	});

	responseObject.result = { accessToken };
	return res.success(responseObject);
});

exports.logout = asyncHandler(async (req, res) =>
{
	let responseObject = {};
	res.clearCookie('jwt', {
		httpOnly: true,
		secure: true,
		sameSite: "none"
	});
	responseObject.message = "Successfully logged out";
	return res.success(responseObject);
});

exports.checkValidDisplayName = asyncHandler(async (req, res) => 
{
	let responseObject = {};
	let { display_name } = req.body;

	let user = await User.findOne({ display_name: display_name.trim() });

	if (user)
	{
		responseObject.code = 403;
		responseObject.message = "This display name is already taken, please try another!";

		return res.error(responseObject);
	}

	responseObject.message = "Valid display name";
	return res.success(responseObject);
});

exports.refreshAccessToken = asyncHandler(async (req, res) =>
{
	let responseObject = {};

	const { jwt } = req.cookies;

	if (jwt)
	{
		const decoded = JWT.validate(jwt);
		if (decoded)
		{
			const accessToken = JWT.generate(decoded.user, "15m");

			responseObject.message = "Successfully refreshed access token";
			responseObject.result = { accessToken };

			return res.success(responseObject);
		}
		else
		{
			responseObject.code = 401;
			responseObject.message = "Invalid refresh token";

			return res.error(responseObject);
		}
	}
	else
	{
		responseObject.code = 401;
		responseObject.message = "Invalid refresh token";

		return res.error(responseObject);
	}
});

exports.forgotPassword = asyncHandler(async (req, res) =>
{
	let responseObject = {};

	const { email } = req.body;
	if (!email)
	{
		responseObject.code = 400;
		responseObject.message = "Please enter your email address";
		return res.error(responseObject);
	}

	const userWithEmail = await User.findOne({ email: email.trim() });
	if (!userWithEmail)
	{
		responseObject.code = 404;
		responseObject.message = "User not registered";
		return res.error(responseObject);
	}

	const resetToken = JWT.generate(userWithEmail, "10m");

	let origin = 'http://localhost:3000';
	if (process.env.NODE_ENV === 'production')
	{
		origin = process.env.CORS_ORIGIN;
	}

	const resetURL = `${origin}/resetPassword/${userWithEmail._id}/${resetToken}`;

	const message = `Please reset your password using the given link.It will expire in 10 minutes.\n\n${resetURL}`;

	const mailOptions = {
		from: process.env.EMAIL_ID,
		to: email,
		subject: "Password Reset Link",
		text: message
	};

	transporter.sendMail(mailOptions, (error, info) =>
	{
		if (error)
		{
			responseObject.code = 500;
			responseObject.message = "Error sending email";
			return res.error(responseObject);
		}
		else
		{
			responseObject.code = 200;
			responseObject.message = "Email sent successfully";
			return res.success(responseObject);
		}
	});

});

exports.validateResetPasswordToken = asyncHandler(async (req, res) =>
{
	const { userId, resetToken } = req.params;
	let responseObject = {};

	if (!userId || !resetToken)
	{
		responseObject.code = 400;
		responseObject.message = "Invalid request";
		return res.error(responseObject);
	}

	const decoded = JWT.validate(resetToken);
	if (!decoded)
	{
		responseObject.code = 401;
		responseObject.message = "Invalid reset token";
		return res.error(responseObject);
	}

	if (decoded.user._id !== userId)
	{
		responseObject.code = 401;
		responseObject.message = "Invalid reset token";
		return res.error(responseObject);
	}

	responseObject.message = "Valid reset token";
	return res.success(responseObject);
});

exports.resetPassword = asyncHandler(async (req, res) =>
{
	const { password } = req.body;
	const { userId, resetToken } = req.body;
	let responseObject = {};

	if (!password)
	{
		responseObject.code = 400;
		responseObject.message = "Password is required";
		return res.error(responseObject);
	}
	if (!userId || !resetToken)
	{
		responseObject.code = 400;
		responseObject.message = "Invalid request";
		return res.error(responseObject);
	}

	const decoded = JWT.validate(resetToken);
	if (!decoded)
	{
		responseObject.code = 400;
		responseObject.message = "Invalid reset token";
		return res.error(responseObject);
	}

	if (decoded.user._id !== userId)
	{
		responseObject.code = 400;
		responseObject.message = "Invalid reset token";
		return res.error(responseObject);
	}

	const user = await User.findById(userId);

	if (!user)
	{
		responseObject.code = 404;
		responseObject.message = "User not found";
		return res.error(responseObject);
	}

	// Set the password virtual property to update the encrypted password
	user.password = password;
	await user.save();

	responseObject.code = 200;
	responseObject.message = "Password reset successful";
	return res.success(responseObject);
});

