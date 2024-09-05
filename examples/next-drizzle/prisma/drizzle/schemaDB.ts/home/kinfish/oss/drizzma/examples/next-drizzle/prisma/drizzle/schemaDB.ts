import { pgTable, serial, text } from "drizzle-orm/pg-core"


export const User = pgTable('User', {
	id: serial('id').primaryKey().notNull(),
	email: text('email').unique().notNull(),
	name: text('name')
});