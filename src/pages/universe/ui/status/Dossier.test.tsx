import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { FLYBY_PRESETS } from '../../model/hazards/flyby'
import { initialWorld } from '../../model/world/engine'
import { __setWorldForTest, worldActions } from '../../model/world/store'
import { viewActions } from '../../model/view'
import { Dossier } from './Dossier'

describe('Dossier', () => {
  beforeEach(() => {
    __setWorldForTest(initialWorld(2026.87))
    viewActions.setScale('solar')
    viewActions.select('earth', false)
  })

  it('고른 천체의 물리량과 탐사 단계를 보여 준다', () => {
    render(() => <Dossier />)
    expect(screen.getByText('지구', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('6,371 km')).toBeInTheDocument()
    expect(screen.getByText(/탐사 단계: 사람이 감/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '달' })).toBeInTheDocument()
  })

  it('목적지 바로 가기로 다른 천체를 고른다', async () => {
    render(() => <Dossier />)
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '목적지 바로 가기' }),
      'jupiter',
    )
    expect(screen.getByText('목성', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText(/갈릴레오·주노/)).toBeInTheDocument()
  })

  it('태양계를 지나가는 블랙홀도 고르고 정보를 본다', async () => {
    const preset = FLYBY_PRESETS.find((f) => f.id === 'black-hole')!
    worldActions.launchFlyby({ ...preset, presetId: preset.id })
    render(() => <Dossier />)
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '목적지 바로 가기' }),
      'intruder',
    )
    expect(
      screen.getByText('항성 블랙홀 (30 AU)', { selector: 'p' }),
    ).toBeInTheDocument()
    expect(screen.getByText('10 M☉')).toBeInTheDocument()
    expect(screen.getByText('다가오는 중')).toBeInTheDocument()
  })

  it('별 규모에서는 분광형과 폭발 버튼을 보여 준다', () => {
    viewActions.setScale('stars')
    viewActions.select('betelgeuse', false)
    render(() => <Dossier />)
    expect(screen.getByText('M1-2Ia')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '이 별을 폭발시키기' }),
    ).toBeInTheDocument()
  })
})
