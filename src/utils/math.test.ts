import { describe, it, expect } from 'vitest';

export const add = (a: number, b: number) => a + b;

describe('Math Utils', () => {
    it('should add two numbers correctly', () => {
        expect(add(2, 3)).toBe(5);
    });
});
