export default {
    routes: [
        {
            method: 'POST',
            path: '/notices/:id/add-view',
            handler: 'api::notice.notice.addView',
            config: {
                auth: false, // 필요에 따라 조정 가능
            },
        },
    ],
};
