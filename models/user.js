const mongoose = require("mongoose");
const crypto = require("crypto");
const { v4: uuid } = require("uuid");
const { Schema } = mongoose;

const userSchema = Schema(
	{
		first_name:
		{
			type: String,
			maxlength: 32,
			trim: true
		},
		last_name:
		{
			type: String,
			maxlength: 32,
			trim: true
		},
		display_name:
		{
			type: String,
			required: [true, "last name is required"],
			maxlength: 32,
			trim: true,
			unique: true
		},
		email:
		{
			type: String,
			required: [true, "Email is required"],
			trim: true,
			unique: true,
			index: true
		},
		profile_picture:
		{
			type: String,
			trim: true,
			default: "https://www.nicepng.com/png/detail/933-9332131_profile-picture-default-png.png"
		},
		is_verified: {
			type: Boolean,
			default: false
		},
		encrypted_password:
		{
			type: String,
			required: true
		},
		salt:
		{
			type: String
		},
		status: {
			type: String,
			enum: ["ACTIVE", "INACTIVE", "DELETED"],
			default: "ACTIVE"
		}
	},
	{
		virtuals:
		{
			password:
			{
				set(password)
				{
					this.salt = uuid();
					this.encrypted_password = this.securePassword(password);
				},
			}
		},
		toObject:
		{
			transform: (doc, ret, options) =>
			{
				delete ret.encrypted_password;
				delete ret.salt;

				return ret;
			}
		},
		timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
	}
);

userSchema.methods =
{
	authenticate: function (plainpassword)
	{
		return this.securePassword(plainpassword) === this.encrypted_password;
	},

	securePassword: function (plainpassword)
	{
		if (!plainpassword)
		{
			return "";
		}

		try
		{
			return crypto
				.createHmac("sha256", this.salt)
				.update(plainpassword)
				.digest("hex");
		}
		catch (err)
		{
			return "";
		}
	},
};

module.exports = mongoose.model("users", userSchema);
