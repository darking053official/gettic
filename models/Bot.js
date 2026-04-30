const mongoose = require('mongoose');

const BotSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30
    },
    prefix: {
        type: String,
        default: '/',
        maxlength: 5
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    ownerId: {
        type: String,
        required: true
    },
    ownerName: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Bot', BotSchema);
