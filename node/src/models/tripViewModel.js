const mongoose = require('mongoose');

const tripViewSchema = new mongoose.Schema({
    totalDistance: Number,
    totalCost: Number,
    userId: String,
    scooterId: String,
    tripId: String,
    start: Date,
    end: Date,
    duration: Number,
}, { collection: 'tripView' });

const tripView = mongoose.model('TripView', tripViewSchema, 'tripView');
module.exports = tripView;
/*
[
  {
    $group: {
      _id: "$tripId",
      totalDistance: {
        $sum: "$distance",
      },
      totalCost: {
        $sum: "$cost",
      },
      count: {
        $sum: 1,
      },
      userIds: {
        $push: "$userId",
      },
      scooterIds: {
        $push: "$scooterId",
      },
      timestamps: {
        $push: "$timestamp",
      },
    },
  },
  {
    $addFields: {
      userId: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$userIds",
              cond: {
                $ne: ["$$this", null],
              },
            },
          },
          0,
        ],
      },
      scooterId: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$scooterIds",
              cond: {
                $ne: ["$$this", null],
              },
            },
          },
          0,
        ],
      },
      start: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$timestamps",
              cond: {
                $ne: ["$$this", null],
              },
            },
          },
          0,
        ],
      },
      end: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$timestamps",
              cond: {
                $ne: ["$$this", null],
              },
            },
          },
          -1,
        ],
      },
    },
  },
  {
    $addFields: {
      duration: {
        $subtract: ["$end", "$start"],
      },
    },
  },
  {
    $project: {
      _id: 0,
      tripId: "$_id",
      scooterId: 1,
      totalDistance: 1,
      totalCost: 1,
      count: 1,
      userId: 1,
      start: 1,
      end: 1,
      duration: 1,
    },
  },
]
*/
