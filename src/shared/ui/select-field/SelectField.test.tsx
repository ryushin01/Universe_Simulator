import { render, screen, within } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { SelectField } from './SelectField'

describe('SelectField', () => {
  it('그룹을 optgroup으로 묶고 고른 값을 전달한다', async () => {
    const onChange = vi.fn()
    render(() => (
      <SelectField
        label="충돌할 천체"
        value="earth"
        onChange={onChange}
        options={[
          { value: 'earth', label: '지구', group: '행성' },
          { value: 'mars', label: '화성', group: '행성' },
          { value: 'moon', label: '달', group: '위성' },
        ]}
      />
    ))
    const select = screen.getByRole('combobox', { name: '충돌할 천체' })
    expect(select).toHaveValue('earth')
    expect(
      within(select).getByRole('group', { name: '위성' }),
    ).toBeInTheDocument()
    await userEvent.selectOptions(select, 'mars')
    expect(onChange).toHaveBeenCalledWith('mars')
  })
})
