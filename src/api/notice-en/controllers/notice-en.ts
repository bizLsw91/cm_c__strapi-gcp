/**
 * notice-en controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::notice-en.notice-en',
    ({ strapi }) =>  ({
        async find(ctx) {
            // 1. 쿼리 파라미터 파싱
            const { recruitCode } = ctx.query
            const rcCode: string = recruitCode ? recruitCode as string : ''
            let categories, cateNameList, categoryFilter
            console.log("rcCode = ", rcCode);

            // 공지사항 (채용관련 아닌것. Category 란 입력안된것, 카테고리 코드에 추가 안된것. 포함.)
            if (rcCode === '') {
                const codePrefix = 'recruit'
                categories = await strapi.entityService.findMany(
                    'api::category-en.category-en',
                    {
                        filters: {
                            code: { $startsWith: codePrefix }
                        },
                        fields: ['name']
                    }
                )
                cateNameList = categories.map(c => c.name)
                categoryFilter = {
                    $or: [
                        {category_en: {$null:true}},
                        {category_en: { name: {$notIn: cateNameList }}}
                    ]
                }
                // 채용공고
            } else if (rcCode === 'recruit-1' || rcCode === 'recruit-2') {
                categories = await strapi.entityService.findMany(
                    'api::category-en.category-en',
                    {
                        filters: {
                            code: { $eq: rcCode }
                        },
                        fields: ['name']
                    }
                )
                cateNameList = categories.map(c => c.name)
                categoryFilter = {category_en:{ name: {$in: cateNameList }}}
            }

            // 4. 공지사항 필터링 조회
            const sanitizedQuery = await this.sanitizeQuery(ctx);
            console.log("sanitizedQuery = ", sanitizedQuery);
            const baseFilters = sanitizedQuery.filters ? sanitizedQuery.filters as Record<string, unknown> : {};

            let filter = {}
            if (Object.keys(baseFilters).length==0) {
                filter = {
                    ...categoryFilter
                }
            } else {
                filter = {
                    $and: [
                        {...baseFilters},
                        {...categoryFilter}
                    ]
                }
            }

            const expandedQuery = {
                ...sanitizedQuery,
                filters: {
                    ...filter
                }
            }
            console.log("baseFilters = ", baseFilters);
            console.log("categoryFilter = ", categoryFilter);
            console.log("baseFilters = ", JSON.stringify(baseFilters));
            console.log("categoryFilter = ", JSON.stringify(categoryFilter));

            const { results, pagination } = await strapi.service('api::notice-en.notice-en').find(expandedQuery)

            // 5. 응답 데이터 변환
            const sanitizedResults = await this.sanitizeOutput(results, ctx)
            return this.transformResponse(sanitizedResults, { pagination })
        }
    })
);
