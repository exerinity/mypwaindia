import type { FlowTestSubtask } from '../api/flow.ts';
import { useNavigate } from 'react-router-dom';

function display(value: string | number | boolean | null | undefined) {
  if (value === null) return 'null';
  if (value === undefined || value === '') return '-';
  return String(value);
}

interface FlowTestProps {
  subtask: FlowTestSubtask;
  onAbort?: (subtaskId: string, actionId: string) => void;
  onTask?: (subtaskId: string, actionId: string) => void;
}

export default function FlowTest({ subtask, onAbort, onTask }: FlowTestProps) {
  const navigate = useNavigate();
  const data = subtask.flow_test;
  const texts = [
    { label: 'primary_text', value: data.primary_text },
    { label: 'secondary_text', value: data.secondary_text },
    ...data.text_samples,
  ];

  function runAction(action: FlowTestSubtask['flow_test']['actions'][number]) {
    if (action.link_type === 'navigate' && action.url) {
      navigate(action.url);
      return;
    }
    if (action.link_type === 'external' && action.url) {
      window.open(action.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (action.link_type === 'abort') {
      onAbort?.(subtask.subtask_id, action.link_id);
      return;
    }
    if (action.link_type === 'task') {
      onTask?.(subtask.subtask_id, action.link_id);
    }
  }

  return (
    <>
      <h3 className="mt-0">Context</h3>
      <div className="table-wrap">
        <table className="table">
          <tbody>
            <tr><th scope="row">Username</th><td className="mono">{display(data.logged_in_as?.username)}</td></tr>
            <tr><th scope="row">ID</th><td className="mono">{display(data.logged_in_as?.id)}</td></tr>
            <tr><th scope="row">Role</th><td className="mono">{display(data.logged_in_as?.role)}</td></tr>
            <tr><th scope="row">State</th><td className="mono">{data.auth_state}</td></tr>
            <tr><th scope="row">ID error</th><td className="mono">{display(data.identity_error)}</td></tr>
            <tr><th scope="row">Rendered</th><td className="mono">{data.rendered_at}</td></tr>
            <tr><th scope="row">Flow ID</th><td className="mono">{data.flow_id}</td></tr>
            <tr><th scope="row">Subtask ID</th><td className="mono">{subtask.subtask_id}</td></tr>
            <tr><th scope="row">Type</th><td className="mono">{subtask.type}</td></tr>
            <tr><th scope="row">Back nav</th><td className="mono">{subtask.subtask_back_navigation}</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Text</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Label</th><th>Text</th><th>Entities</th></tr>
          </thead>
          <tbody>
            {texts.map(({ label, value }) => (
              <tr key={label}>
                <td className="mono">{label}</td>
                <td>{value.text}</td>
                <td className="mono">
                  {value.entities.length === 0
                    ? '[]'
                    : value.entities.map((entity) => {
                        const item = entity as { type?: string; from_index?: number; to_index?: number };
                        return `${display(item.type)}:${display(item.from_index)}-${display(item.to_index)}`;
                      }).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Options</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Label</th><th>Value</th></tr>
          </thead>
          <tbody>
            {data.options.map((option) => (
              <tr key={option.value}>
                <td>{option.label}</td>
                <td className="mono">{option.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Flags</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Flag</th><th>Value</th></tr>
          </thead>
          <tbody>
            {Object.entries(data.flags).map(([flag, value]) => (
              <tr key={flag}>
                <td className="mono">{flag}</td>
                <td className="mono">{display(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Input</h3>
      {data.inputs.map((input) => (
        <div key={input.input_id}>
          <label htmlFor={`flow-test-${input.input_id}`}>{input.label}</label>
          <input
            id={`flow-test-${input.input_id}`}
            type={input.type}
            defaultValue={input.value}
            placeholder={input.placeholder}
            required={input.required}
            disabled={input.disabled}
            readOnly={input.read_only}
          />
        </div>
      ))}

      <label htmlFor={`flow-test-${data.textarea.input_id}`}>{data.textarea.label}</label>
      <textarea
        id={`flow-test-${data.textarea.input_id}`}
        defaultValue={data.textarea.value}
        placeholder={data.textarea.placeholder}
        disabled={data.textarea.disabled}
      />

      <label htmlFor={`flow-test-${data.select.input_id}`}>{data.select.label}</label>
      <select
        id={`flow-test-${data.select.input_id}`}
        defaultValue={data.select.value}
        disabled={data.select.disabled}
      >
        {data.select.options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <h3>Checkboxes</h3>
      {data.checkboxes.map((checkbox) => (
        <label className="checkbox-row" key={checkbox.input_id}>
          <input type="checkbox" defaultChecked={checkbox.checked} disabled={checkbox.disabled} />
          <span>{checkbox.label}</span>
        </label>
      ))}

      <h3>Toggles</h3>
      {data.toggles.map((toggle) => (
        <div className="row gap-sm" key={toggle.input_id}>
          <label className="toggle-switch">
            <input type="checkbox" defaultChecked={toggle.checked} disabled={toggle.disabled} />
            <span className="toggle-track" />
          </label>
          <span>{toggle.label}</span>
        </div>
      ))}

      <h3>Buttons</h3>
      <div className="btn-row">
        {data.buttons.map((button) => (
          <button
            key={button.button_id}
            type="button"
            className={button.style === 'primary' ? undefined : button.style}
            disabled={button.disabled}
          >
            {button.style === 'option' ? (
              <>
                <span className="option-label">{button.label}</span>
                {button.description && <span className="option-desc">{button.description}</span>}
              </>
            ) : button.label}
          </button>
        ))}
      </div>

      <h3>Actions</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>ID</th>
              <th>Label</th>
              <th>Logged out</th>
              <th>Pending</th>
              <th>Staging</th>
              <th>Capacity</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {data.actions.map((action) => (
              <tr key={action.link_id}>
                <td className="mono">{action.link_type}</td>
                <td className="mono">{action.link_id}</td>
                <td>{action.label}</td>
                <td>{display(action.logged_out_label)}</td>
                <td>{display(action.pending_label)}</td>
                <td>{display(action.staging_pending_label)}</td>
                <td>{display(action.at_capacity_label)}</td>
                <td className="mono">{display(action.url)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="btn-row">
        {data.actions.map((action) => (
          <button
            key={action.link_id}
            type="button"
            className={action.link_type === 'abort' ? 'danger' : 'secondary'}
            onClick={() => runAction(action)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </>
  );
}
