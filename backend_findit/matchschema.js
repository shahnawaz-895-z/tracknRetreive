import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
    lostItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LostItem',
        required: true
    },
    foundItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoundItem',
        required: true
    },
    lostUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    foundUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    similarityScore: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    status: {
        type: String,
        enum: ['pending', 'matched', 'declined', 'returned', 'claimed', 'unclaimed'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
matchSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Match = mongoose.model('Match', matchSchema);

export default Match; 