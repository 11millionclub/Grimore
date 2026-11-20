import { ARCHETYPES, QUESTIONS, scoreArchetype } from '../archetypes';

describe('reader archetype quiz', () => {
  it('has four questions with four options each', () => {
    expect(QUESTIONS).toHaveLength(4);
    QUESTIONS.forEach((q) => expect(q.options).toHaveLength(4));
  });

  it('scores a night owl', () => {
    expect(scoreArchetype({ when: 'night', length: 'short', hook: 'people', next: 'friends' }, [])).toBe('night');
  });

  it('scores a saga reader, helped by fantasy', () => {
    expect(scoreArchetype({ when: 'evening', length: 'long', hook: 'world', next: 'pile' }, ['fantasy'])).toBe('saga');
  });

  it('scores an archivist', () => {
    expect(scoreArchetype({ when: 'morning', length: 'mid', hook: 'people', next: 'awards' }, [])).toBe('archive');
  });

  it('scores a sprint reader', () => {
    expect(scoreArchetype({ when: 'lunch', length: 'short', hook: 'plot', next: 'cover' }, ['thriller'])).toBe('sprint');
  });

  it('falls back to the first archetype with no answers', () => {
    expect(scoreArchetype({}, [])).toBe('night');
    expect(Object.keys(ARCHETYPES)).toContain(scoreArchetype({}, []));
  });
});
