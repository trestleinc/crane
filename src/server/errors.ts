export class CraneError extends Error {
	constructor(
		message: string,
		public code: string,
	) {
		super(message);
		this.name = "CraneError";
	}
}

export class NotFoundError extends CraneError {
	constructor(resource: string, id: string) {
		super(`${resource} not found: ${id}`, "NOT_FOUND");
		this.name = "NotFoundError";
	}
}

export class ValidationError extends CraneError {
	constructor(message: string) {
		super(message, "VALIDATION_ERROR");
		this.name = "ValidationError";
	}
}

export class AuthorizationError extends CraneError {
	constructor(message: string = "Unauthorized") {
		super(message, "UNAUTHORIZED");
		this.name = "AuthorizationError";
	}
}
