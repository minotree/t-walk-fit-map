import { expect, test } from 'vitest';
import { formatRegion, parseRegion } from '@walk-fit/data';

test('기존 시도/시군구 저장 문자열을 복원한다', () => {
  expect(parseRegion('서울특별시 도봉구')).toEqual({ sido: '서울특별시', sigungu: '도봉구' });
  expect(formatRegion('서울특별시', '도봉구')).toBe('서울특별시 도봉구');
});

test('다른 시도의 구를 조합하지 않으며 시도만 저장할 수 있다', () => {
  expect(formatRegion('부산광역시', '도봉구')).toBe('부산광역시');
  expect(parseRegion('서울특별시 잘못된구')).toEqual({ sido: '서울특별시', sigungu: '' });
});

test('미선택과 목록 밖의 저장 데이터는 선택값으로 취급하지 않는다', () => {
  expect(parseRegion('')).toEqual({ sido: '', sigungu: '' });
  expect(parseRegion('서울')).toEqual({ sido: '', sigungu: '' });
  expect(formatRegion('', '도봉구')).toBe('');
});
