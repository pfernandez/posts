////////////////////////////////////////////////////////////////////////////////
// Posts: { title, content, ownerId }

Posts = new Meteor.Collection('posts');

Posts.allow({
    insert: function(userId, doc) {
        // Users must be logged in, and the document must be owned by the user.
        return (userId && doc.ownerId === userId);
    },
    update: function(userId, doc, fields, modifier) {
        // Users can only edit their own documents.
        return doc.ownerId === userId;
    },
    remove: function(userId, doc) {
        // Users can only remove their own documents.
        return doc.ownerId === userId;
    },
    fetch: ['ownerId']
});

Posts.deny({
    update: function(userId, docs, fields, modifier) {
        // The user may only edit particular fields.
        return (_.without(fields, 'title', 'content').length > 0);
    }
});

Meteor.methods({

    // Insert a new post into the database.
    newPost: function(properties) {
    
        var user = Meteor.userId();
    
        if(user) {
        
            if(! properties) {
                properties = {};
            }
            
            if(properties.title) {
                properties.title = getUniqueTitle(properties.title);
            }
            else {
                properties.title = '';
            }
            
            if(! properties.content) {
                properties.content = '';
            }
        
            // Make sure only allowed properties are inserted.
            var post = _.extend(_.pick(properties, 'title', 'content'), {
                ownerId: user, created: new Date().getTime()
            });

            properties._id = Posts.insert(post);
            
            return properties;
        }
    },
});

// Returns a cursor of posts belonging to the specified user.
getPostList = function(userId) {
    var postList = Posts.find({ownerId: userId},
        {fields: {title: 1}}, {sort: {_id: -1}});
    if(postList.count() > 0) {
        return postList;
    }
    else {
        return null;
    }
}

// If the desired title is not unique, append and integer to it.
getUniqueTitle = function(title) {

    var postList = getPostList(Meteor.userId());
    
    if(postList) {
    
        if(! title) {
            title = 'Untitled Post';
        }
        
        var posts = postList.fetch(),
        newTitle = title,
        matchFound = true,
        count = 1;
        
        while(matchFound) {
            matchFound = false;
            for(var i = 0; i < posts.length; i++) {
                if(newTitle === posts[i].title) {
                    newTitle = title + ' ' + count;
                    matchFound = true;
                    count++;
                }
            }
        }
        
        if(count > 1) {
            title = newTitle;
        }
    }
    
    return title;
}



////////////////////////////////////////////////////////////////////////////////
// Meteor.users: { currentPost }

Meteor.users.allow({
    update: function(userId, doc, fields, modifier) {
        // Users can only update the current post ID.
        return (fields.length === 1 && _.contains(fields, 'currentPostId'));
    }
});
