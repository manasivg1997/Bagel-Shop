var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose');

var subSchema = mongoose.Schema({
    addresstype: String,
    location: String,
    zipcode: String
}, { _id: false });

var User = new Schema({
    firstname: String,
    lastname: String,
    username: String,
    password: String,
    dob: Date,
    gender: String,
    emailid: String,
    phonenumber: String,
    addresses: [subSchema],
    role: String
});

User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', User);
