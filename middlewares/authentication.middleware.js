const JWT = require("@configs/jwt");
const User = require("@models/user");
const expressAsyncHandler = require("express-async-handler");

const authenticateRequest = expressAsyncHandler(async (req, res, next) =>
{
	const result = JWT.validateRequestHeader(req.headers.authorization);

	if (!result)
	{
		return res.error({ message: "Failed to authenticate", code: 401 });
	}

	const userInfo = await User.findById(result.user._id);
	req.user = userInfo;
	next();
});

module.exports =
{
	authenticateRequest
};
