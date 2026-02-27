/**
 * notice controller
 */
import { factories } from '@strapi/strapi'
export default factories.createCoreController('api::notice.notice'
    ,({ strapi }) =>  ({
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
                    'api::category.category',
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
                        {category_ko: {$null:true}},
                        {category_ko: { name: {$notIn: cateNameList }}}
                    ]
                }
            // 채용공고
            } else if (rcCode === 'recruit-1' || rcCode === 'recruit-2') {
                categories = await strapi.entityService.findMany(
                    'api::category.category',
                    {
                        filters: {
                            code: { $eq: rcCode }
                        },
                        fields: ['name']
                    }
                )
                cateNameList = categories.map(c => c.name)
                categoryFilter = {category_ko:{ name: {$in: cateNameList }}}
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
            console.log("baseFilters = ", JSON.stringify(baseFilters));
            console.log("categoryFilter = ", JSON.stringify(categoryFilter));

            const { results, pagination } = await strapi.service('api::notice.notice').find(expandedQuery)

            // 5. 응답 데이터 변환
            const sanitizedResults = await this.sanitizeOutput(results, ctx)
            return this.transformResponse(sanitizedResults, { pagination })
        }
    })
);
