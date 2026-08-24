import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import {Router} from 'express';
import { departments, subjects } from '../db/schema/app.js';
import { db } from '../db/index.js';
const router = Router();


// get all subjects with optional search pagination and filtering
router.get('/', async (req, res) =>{
    try {
        const {search, department, page = 1, limit = 10} = req.query;
        
        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);

        const offset = (currentPage - 1) * limitPerPage;
        
        const filterConditions = [];

        // if search query exists, filter by subject name or code
        if(search){
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`)
                )
            );
        }

        // if departmant filter exists, match department name
        if(department){
            filterConditions.push(ilike(departments.name, `%${search}%`))
        }

        // combine all the filters if any exist using AND
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
        .select({count: sql<number>`count(*)`})
        .from(subjects)
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(whereClause);


        const totalCount = countResult[0]?.count ?? 0;

        const subjectList = await db.select({
            ...getTableColumns(subjects), 
            departments:{...getTableColumns(departments)}
        }).from(subjects)
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(whereClause)
        .orderBy(desc(subjects.createdAt))
        .limit(limitPerPage)
        .offset(offset);

        res.status(200).json({
            data: subjectList,
            pagination:{
                page: currentPage,
                limit: limitPerPage,
                total : totalCount,
                totalPage: Math.ceil(totalCount/ limitPerPage)
            }
        })


    } catch (error) {
        console.log(`GET /subjects error ${error}`);
        res.status(500).json({error: 'failed to get subjects'});
    }
})


export default router;