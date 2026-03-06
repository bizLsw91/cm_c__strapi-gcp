export default {
    routes: [
        {
            method: 'POST',
            path: '/notices-en/:id/add-view',
            handler: 'api::notice-en.notice-en.addView',
            config: {
                auth: false,
            },
        },
    ],
};
