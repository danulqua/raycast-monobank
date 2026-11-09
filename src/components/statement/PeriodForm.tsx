import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Period, PeriodPreset } from "../../types";
import { endOfDay, isPreset, periodPresetTitles, resolvePeriod, startOfDay, validatePeriod } from "../../utils";

type Choice = PeriodPreset | "custom";

interface FormValues {
  choice: Choice;
  from?: Date | null;
  to?: Date | null;
}

const presets = Object.entries(periodPresetTitles) as [PeriodPreset, string][];

export default function PeriodForm(props: { period: Period; onChange: (period: Period) => void }) {
  const { period, onChange } = props;
  const navigation = useNavigation();
  const [choice, setChoice] = useState<Choice>(isPreset(period) ? period.preset : "custom");
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({});

  // A custom range starts from the current period, so switching to it is a small step.
  const current = resolvePeriod(period);
  const defaultFrom = new Date(current.from * 1000);
  const defaultTo = new Date((current.to ?? Date.now() / 1000) * 1000);

  function onSubmit(values: FormValues) {
    if (values.choice !== "custom") {
      onChange({ preset: values.choice });
      navigation.pop();
      return;
    }

    if (!values.from || !values.to) {
      setErrors({ from: values.from ? undefined : "Required", to: values.to ? undefined : "Required" });
      return;
    }

    // The whole From and To days. A range ending today ends now, since monobank rejects future times.
    const now = new Date();
    const from = Math.floor(startOfDay(values.from).getTime() / 1000);
    const to = Math.floor(Math.min(endOfDay(values.to).getTime(), now.getTime()) / 1000);
    const error = validatePeriod(from, to, now);

    if (error) {
      setErrors(from >= to ? { from: error } : { to: error });
      return;
    }

    onChange({ from, to });
    navigation.pop();
  }

  return (
    <Form
      navigationTitle="Change Period"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Change Period" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="choice" title="Period" value={choice} onChange={(value) => setChoice(value as Choice)}>
        <Form.Dropdown.Section>
          {presets.map(([value, title]) => (
            <Form.Dropdown.Item key={value} value={value} title={title} />
          ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section>
          <Form.Dropdown.Item value="custom" title="Custom Range" />
        </Form.Dropdown.Section>
      </Form.Dropdown>

      {choice === "custom" && (
        <>
          <Form.DatePicker
            id="from"
            title="From"
            type={Form.DatePicker.Type.Date}
            defaultValue={defaultFrom}
            max={new Date()}
            error={errors.from}
            onChange={() => setErrors({})}
          />
          <Form.DatePicker
            id="to"
            title="To"
            type={Form.DatePicker.Type.Date}
            defaultValue={defaultTo}
            max={new Date()}
            error={errors.to}
            onChange={() => setErrors({})}
          />
          <Form.Description text="monobank returns at most 31 days at a time." />
        </>
      )}
    </Form>
  );
}
