Router.map( function() {

    this.route('post', {
        path: '/:_id?',
        layoutTemplate: 'layout',
        loadingTemplate: 'loading',
        yieldTemplates: {
            'deletePostDialog': {to: 'deletePostDialog'},
            'postList': {to: 'aside'}
        },
        waitOn: function() {
            Session.set('post_id', this.params._id);
            return [Meteor.subscribe('posts', this.params._id), Meteor.subscribe('userData')];
        }
    });
});

