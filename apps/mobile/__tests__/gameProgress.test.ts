import { getCurrentQuestionInLevel } from '../utils/gameProgress';

describe('getCurrentQuestionInLevel', () => {
  it.each([
    [0, 1],
    [9, 10],
    [10, 1],
    [19, 10],
    [20, 1],
    [29, 10],
  ])('maps score %i to question %i of its level', (score, question) => {
    expect(getCurrentQuestionInLevel(score)).toBe(question);
  });

  it('keeps unexpected scores inside the visible 1-to-10 range', () => {
    expect(getCurrentQuestionInLevel(-1)).toBe(1);
    expect(getCurrentQuestionInLevel(30)).toBe(10);
    expect(getCurrentQuestionInLevel(Number.NaN)).toBe(1);
  });
});
