import { User } from '../models';
import { pickDefined } from '../utils/pickDefined';

// Only these fields are accepted from the request body.
// isLibrarian is deliberately NOT here, otherwise anyone could
// register with {"isLibrarian": true} and make themselves a librarian.
export function toUserRequestDTO(body: Record<string, any>) {
    return pickDefined(body, ['name', 'email', 'password']);
}

// What we send back. The password hash is never included.
export function toUserResponseDTO(user: User) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        isLibrarian: user.isLibrarian,
    };
}