import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { Router } from "express";
import { user } from "../db/schema/auth.js";
import { db } from "../db/index.js";
import { classes, departments, subjects } from "../db/schema/app.js";

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

// get user by ID
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const userResult = await db
      .select({
        ...getTableColumns(user),
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ data: userResult[0] });
  } catch (error) {
    console.log(`GET /users/:userId error ${error}`);
    res.status(500).json({ error: "failed to get user" });
  }
});

// get departments for a specific user (teacher)
router.get("/:userId/departments", async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(
      Math.max(1, parseInt(String(limit), 10) || 10),
      100,
    );
    const offset = (currentPage - 1) * limitPerPage;

    // Check if user exists and is a teacher
    const userResult = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userResult[0]?.role !== "teacher") {
      return res
        .status(403)
        .json({ error: "Only teachers can have departments" });
    }

    // Get departments through subjects the teacher teaches
    const departmentsResult = await db
      .select({
        ...getTableColumns(departments),
      })
      .from(departments)
      .innerJoin(subjects, eq(subjects.departmentId, departments.id))
      .innerJoin(classes, eq(classes.subjectId, subjects.id))
      .where(eq(classes.teacherId, userId))
      .groupBy(departments.id)
      .orderBy(desc(departments.name));

    const totalCount = departmentsResult.length;

    const paginatedDepartments = departmentsResult.slice(
      offset,
      offset + limitPerPage,
    );

    res.status(200).json({
      data: paginatedDepartments,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPage: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.log(`GET /users/:userId/departments error ${error}`);
    res.status(500).json({ error: "failed to get user departments" });
  }
});

// get subjects for a specific user (teacher)
router.get("/:userId/subjects", async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(
      Math.max(1, parseInt(String(limit), 10) || 10),
      100,
    );
    const offset = (currentPage - 1) * limitPerPage;

    // Check if user exists and is a teacher
    const userResult = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userResult[0]?.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can have subjects" });
    }

    // Get subjects the teacher teaches
    const subjectsResult = await db
      .select({
        ...getTableColumns(subjects),
        department: { ...getTableColumns(departments) },
      })
      .from(subjects)
      .innerJoin(departments, eq(subjects.departmentId, departments.id))
      .innerJoin(classes, eq(classes.subjectId, subjects.id))
      .where(eq(classes.teacherId, userId))
      .groupBy(subjects.id)
      .orderBy(desc(subjects.name));

    const totalCount = subjectsResult.length;

    const paginatedSubjects = subjectsResult.slice(
      offset,
      offset + limitPerPage,
    );

    res.status(200).json({
      data: paginatedSubjects,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPage: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.log(`GET /users/:userId/subjects error ${error}`);
    res.status(500).json({ error: "failed to get user subjects" });
  }
});

export default router;
