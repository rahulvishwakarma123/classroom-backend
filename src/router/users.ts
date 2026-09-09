import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { Router } from "express";
import { user } from "../db/schema/auth.js";
import { db } from "../db/index.js";

const router = Router();

// get all users with optional search, role filtering, and pagination
router.get("/", async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(
      Math.max(1, parseInt(String(limit), 10) || 10),
      100,
    );

    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    // if search query exists, filter by user name or email
    if (search) {
      filterConditions.push(
        or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`)),
      );
    }

    // if role filter exists, match role exactly
    if (role) {
      const validRoles = ["student", "teacher", "admin"] as const;
      const roleValue = String(role);
      if (validRoles.includes(roleValue as any)) {
        filterConditions.push(
          eq(user.role, roleValue as "student" | "teacher" | "admin"),
        );
      }
    }

    // combine all the filters if any exist using AND
    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const userList = await db
      .select({
        ...getTableColumns(user),
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: userList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPage: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.log(`GET /users error ${error}`);
    res.status(500).json({ error: "failed to get users" });
  }
});

export default router;
