/*
This file will only be executed on the server.
*/

Meteor.publish('posts', function() {
    // Users may only view their own posts.
    return Posts.find({ownerId: this.userId});
});

Meteor.publish('userData', function () {
  return Meteor.users.find({_id: this.userId},
    {fields: {'currentPostId': 1}});
});

// Add fields to the user document upon creation.
Accounts.onCreateUser(function(options, user) {
    user.currentPostId = null;
    return user;
});
