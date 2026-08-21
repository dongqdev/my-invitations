import type { ParentInfo } from './types';
import type { ParentFieldErrors } from './validation';
import styles from './ParentAccountFields.module.css';

interface ParentAccountFieldsProps {
  idPrefix: string;
  label: string;
  value: ParentInfo;
  errors?: ParentFieldErrors;
  onChange: (next: ParentInfo) => void;
}

/**
 * 부모님 한 분(성함 + 계좌 은행/예금주/계좌번호) 입력 세트.
 * 신랑측 아버지/어머니, 신부측 아버지/어머니 — 4곳에서 재사용된다.
 * 네 칸 전체가 선택 항목이지만, 하나라도 채우기 시작하면 나머지도
 * 채워야 한다는 검증은 부모 컴포넌트(validation.ts)가 맡는다.
 */
export default function ParentAccountFields({
  idPrefix,
  label,
  value,
  errors,
  onChange,
}: ParentAccountFieldsProps) {
  function updateName(name: string) {
    onChange({ ...value, name });
  }

  function updateAccount(field: keyof ParentInfo['account'], next: string) {
    onChange({ ...value, account: { ...value.account, [field]: next } });
  }

  return (
    <fieldset className={styles.card}>
      <span className={styles.accentBar} aria-hidden="true" />
      <legend className={styles.legend}>{label}</legend>

      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-name`} className={styles.label}>
          성함
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={value.name}
          onChange={(event) => updateName(event.target.value)}
          placeholder="예: 홍길동"
          className={styles.input}
          aria-invalid={Boolean(errors?.name)}
          aria-describedby={errors?.name ? `${idPrefix}-name-error` : undefined}
        />
        {errors?.name && (
          <p id={`${idPrefix}-name-error`} className={styles.fieldError} role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div className={styles.accountRow}>
        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-bank`} className={styles.label}>
            은행
          </label>
          <input
            id={`${idPrefix}-bank`}
            type="text"
            value={value.account.bank}
            onChange={(event) => updateAccount('bank', event.target.value)}
            placeholder="예: 국민은행"
            className={styles.input}
            aria-invalid={Boolean(errors?.bank)}
            aria-describedby={errors?.bank ? `${idPrefix}-bank-error` : undefined}
          />
          {errors?.bank && (
            <p id={`${idPrefix}-bank-error`} className={styles.fieldError} role="alert">
              {errors.bank}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-holder`} className={styles.label}>
            예금주
          </label>
          <input
            id={`${idPrefix}-holder`}
            type="text"
            value={value.account.holder}
            onChange={(event) => updateAccount('holder', event.target.value)}
            placeholder="예: 홍길동"
            className={styles.input}
            aria-invalid={Boolean(errors?.holder)}
            aria-describedby={errors?.holder ? `${idPrefix}-holder-error` : undefined}
          />
          {errors?.holder && (
            <p id={`${idPrefix}-holder-error`} className={styles.fieldError} role="alert">
              {errors.holder}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-accountNumber`} className={styles.label}>
            계좌번호
          </label>
          <input
            id={`${idPrefix}-accountNumber`}
            type="text"
            inputMode="numeric"
            value={value.account.accountNumber}
            onChange={(event) => updateAccount('accountNumber', event.target.value)}
            placeholder="- 없이 숫자만"
            className={styles.input}
            aria-invalid={Boolean(errors?.accountNumber)}
            aria-describedby={errors?.accountNumber ? `${idPrefix}-accountNumber-error` : undefined}
          />
          {errors?.accountNumber && (
            <p id={`${idPrefix}-accountNumber-error`} className={styles.fieldError} role="alert">
              {errors.accountNumber}
            </p>
          )}
        </div>
      </div>
    </fieldset>
  );
}
