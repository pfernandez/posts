/*
This file will be executed only on the client.
*/



////////////////////////////////////////////////////////////////////////////////
// Helper Variables and Functions


var justLoggedIn = false,   // so we can store an entered post on login
    savedSelection = null,  // temp storage for the Rangy library
    editorHasFocus = false, // used to return focus to editor on hot reload
    timeOut = null,
    interval = null;

Session.setDefault('saving', false);

// Reactive data storage for the delete dialog.
Session.setDefault('postToDelete', {_id: null, title: null});

var post = {
    
    id: function(postId) {
        if(postId || postId === null) {
            Session.set('post_id', postId);
            Meteor.users.update({_id: Meteor.userId()},
                {$set: {currentPostId: this.id()}}
            );
        }
        else {
            return Session.get('post_id');
        }
    },

    // Store a post to the user database to be retrieved on the next visit.
    setCurrent: function(postId) {
        this.id(postId);

    },
    
    // Set the id to the user's most recently visited post.
    loadMostRecent: function() {
        var user = Meteor.users.findOne({_id: Meteor.userId()},
            {fields: {currentPostId: 1}});
        if(user) {
            this.id(user.currentPostId);
        }
    },

    // Attempt to add a new post on the server, and store it's ID as
    // the user's current post if successful.
    add: function(properties) {
        var that = this;
        Meteor.call('newPost', properties, function(error, newPost) {
            if(error) {
                console.log(error.reason);
            }
            else if(newPost) {
                that.id(newPost._id);
            }
        });
    },
    
    // Returns a post title, or updates the title if provided.
    title: function(newTitle) {
        if(newTitle) {
            Posts.update({_id: post.id()}, {$set: {title: newTitle}});
        }
        else {
            var postObj = Posts.findOne({_id: this.id()}, {fields: {title: 1}});
            if(postObj) {
                return postObj.title;
            }
        }
    },
    
    // Returns a post's content, or updates the content if provided.
    content: function(newContent, callback) {
        if(newContent) {
    	   Posts.update({_id: post.id()},
	            {$set: {content: _.escape(newContent)}},
	            function() { callback(); }
	        );
	    }
        else {
            postObj = Posts.findOne({_id: this.id()},{fields: {content: 1}});
            if(postObj) {
                return _.unescape(postObj.content);
            }
        }
    },

}




// Retrieve the current post ID and title on login or refresh.
Deps.autorun(function() {

    if(Meteor.loggingIn()) {
        justLoggedIn = true;
    }

    var userId = Meteor.userId();
    
    if(userId && ! post.id()) {
        // If there was a post begun before login, add it to the database.
        // Otherwise load the most recent post.
        if(justLoggedIn) {
        
            var titleElement = document.getElementById('post-title'),
                contentElement = document.getElementById('editor'),
                newTitle = null,
                newContent = null;
                
            if(titleElement) {
                var newTitle = titleElement.value;
            }
            
            if(contentElement) {
                var newContent = contentElement.innerHTML;
            }
            
            if(newTitle || newContent) {
                post.add({title: newTitle, content: newContent});
            }
            
            justLoggedIn = false;
        }
        
        post.loadMostRecent();
    }
    else if(! userId && post.id()) {
        // The user just logged out, so remove the current post.
        post.id(null);
    }
});



////////////////////////////////////////////////////////////////////////////////
// post.html


Template.post.postTitle = function() {
    return post.title();
}

Template.post.postContent = function() {
    return post.content();
}

Template.post.saveIndicator = function() {
    if(Session.get('saving')) {
        return 'Saving...';
    }
    else {
        return 'Saved.';
    }
}

Template.post.events({

    // Store the title on keyup in the input field.
    'change input' : function(e) {
        var newTitle = getUniqueTitle(e.target.value);
        if(post.id()) {
		    post.title(newTitle);
		}
		else {
		    post.add({title: newTitle});
		}
    },

    // Store the content in the editor.
    'input #editor' : function(e) {
        savedSelection = rangy.saveSelection();
        if(post.id()) {
        
            // If "saving..." is not visible, show it.
            if(! interval) {
                Session.set('saving', true);
            }

            // Store the content to database. If successful, check every 3
            // seconds to see if "saving..." is visible. If it is, turn it off.
            post.content(e.target.innerHTML, function() {
                if(! interval) {
                    interval = Meteor.setInterval(function() {
                        Session.set('saving', false);
                        Meteor.clearInterval(interval);
                        interval = null;
                    }, 3000);
                } 
            });
        }
        else {
            post.add({content: _.escape(e.target.innerHTML)});
        }
    },
    
    'focus #editor': function() {
        editorHasFocus = true;
    },
    
    'blur #editor': function() {
        editorHasFocus = false;
    }
});

Template.post.rendered = function() {
    // Restore selection and/or cursor postion when the editor is redrawn.
    if(savedSelection) {
        rangy.restoreSelection(savedSelection);
    }
}



////////////////////////////////////////////////////////////////////////////////
// postlist.html

Template.postList.userPosts = function() {
    return getPostList(Meteor.userId());
}

Template.postList.events({
    // add an empty post when the button is clicked.
    'click .addPost' : function(e) {
        post.add();
    },
});

Template.postList.rendered = function() {

    // If the user has any posts, make sure one is always current.
    var list = this.findAll('.list-group-item');
    if(list.length > 0 && ! this.find('.active')) {
        list[list.length-1].click();
    }
    
    // Updating the post list causes the editor to lose focus. Refocus it.
    if(editorHasFocus) {
       document.getElementById('editor').focus();
    }
}

Template.postItem.postClass = function() {
    return (post.id() === this._id) ? 'active' : '';
}

Template.postItem.events({
    'click .list-group-item': function(e) {
        e.preventDefault();
        if(! Session.get('postToDelete')._id) {
            post.id(this._id);
        }
    }
});

Template.postItem.events({
    // Remove post when the button is clicked.
    'click .close' : function(e) {
        Session.set('postToDelete', this);
    }
});



////////////////////////////////////////////////////////////////////////////////
// delete.html


Template.deletePostDialogBody.deletePostTitle = function() {
    return Session.get('postToDelete').title;
}

Template.deletePostDialog.events({
    // Remove post when the button is clicked.
    'click .removePost' : function(e) {
        var postId = Session.get('postToDelete')._id;
        if(postId === post.id()) {
            post.id(null);
        }
        Posts.remove(postId);
        Session.set('postToDelete', {_id: null, title: 'this post'});
    }
});

