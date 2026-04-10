import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false,
    },
    role: {
        type: String,
        //enum means only these 4 values are allowed, MongoDB rejects anything else.
        enum: ['customer', 'restaurant_owner', 'delivery_agent', 'admin'],
        default: 'customer',
    },

    //For restaurant owners, which restaurant they manage
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
    },

    //logout from all devices
    refreshToken: {
        type: String,
        select: false,
    },
}, {
    timestamps: true, //Automatically adds createdAt and updatedAt fields
});


//This runs AUTOMATICALLY before every .save() call. If the password was changed (or is new), hash it before storing.
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    //bcrypt.hash(password, saltRounds);
    this.password = await bcrypt.hash(this.password, 12);
    next();
});


//This method compares a plain text password with the stored hash.
userSchema.methods.comparePassword = async function (candidatePassword) {
    //bcrypt.compare returns true if they match, false if not
    return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);