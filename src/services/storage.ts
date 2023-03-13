import { assertUnreachable } from '../utils';

/**
 * An abstraction layer for localStorage and sessionStorage.
 * Prevents the need for bloat such as JSON methods and allows for better typing.
 * Also could be expanded for potential future needs.
 */
export class Storage {
    constructor(private readonly type: 'local' | 'session') {}

    get<T>(key: string): T | null {
        let item: string | null;
        switch (this.type) {
            case 'local':
                item = localStorage.getItem(key);
                break;
            case 'session':
                item = sessionStorage.getItem(key);
                break;
            default:
                assertUnreachable(this.type);
        }
        if (item === null) {
            return null;
        }
        return JSON.parse(item);
    }

    set<T>(key: string, item: T) {
        const itemString = JSON.stringify(item);
        switch (this.type) {
            case 'local':
                localStorage.setItem(key, itemString);
                break;
            case 'session':
                sessionStorage.setItem(key, itemString);
                break;
            default:
                assertUnreachable(this.type);
        }
    }

    remove(key: string) {
        switch (this.type) {
            case 'local':
                localStorage.removeItem(key);
                break;
            case 'session':
                sessionStorage.removeItem(key);
                break;
            default:
                assertUnreachable(this.type);
        }
    }
}
