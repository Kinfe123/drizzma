
import { logger as baseLogger } from '@prisma/sdk'
import { GEN_NAME } from '../../../const'
function log(message: string) {

	baseLogger.log(`${GEN_NAME}: ${message}`)
}

function createTask() {

	const timeStarted = Date.now()
	return {
		end(message: string) {
			return log(`${message} in ${Date.now() - timeStarted}ms`)
		},
	}
}

export const logger = {
	log,
	createTask,
}