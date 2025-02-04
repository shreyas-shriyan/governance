import React, { useEffect, useState } from 'react'
import Helmet from 'react-helmet'
import { navigate } from "gatsby-plugin-intl"
import { Button } from "decentraland-ui/dist/components/Button/Button"
import { Header } from "decentraland-ui/dist/components/Header/Header"
import { Field } from "decentraland-ui/dist/components/Field/Field"
import { Container } from "decentraland-ui/dist/components/Container/Container"
import { Loader } from "decentraland-ui/dist/components/Loader/Loader"
import { newProposalBanNameScheme } from '../../entities/Proposal/types'
import Catalyst from 'decentraland-gatsby/dist/utils/api/Catalyst'
import Paragraph from 'decentraland-gatsby/dist/components/Text/Paragraph'
import MarkdownTextarea from 'decentraland-gatsby/dist/components/Form/MarkdownTextarea'
import useFormatMessage from 'decentraland-gatsby/dist/hooks/useFormatMessage'
import useEditor, { assert, createValidator } from 'decentraland-gatsby/dist/hooks/useEditor'
import ContentLayout, { ContentSection } from '../../components/Layout/ContentLayout'
import { Governance } from '../../api/Governance'
import loader from '../../modules/loader'
import locations from '../../modules/locations'
import Label from 'decentraland-gatsby/dist/components/Form/Label'
import { isValidName } from '../../entities/Proposal/utils'
import useAuthContext from 'decentraland-gatsby/dist/context/Auth/useAuthContext'
import Head from 'decentraland-gatsby/dist/components/Head/Head'
import MarkdownNotice from '../../components/Form/MarkdownNotice'
import LogIn from '../../components/User/LogIn'
import './submit.css'

type BanNameState = {
  name: string,
  description: string,
}

const initialPollState: BanNameState = {
  name: '',
  description: '',
}

const schema = newProposalBanNameScheme.properties

const edit = (state: BanNameState, props: Partial<BanNameState>) => {
  return {
    ...state,
    ...props
  }
}

const validate = createValidator<BanNameState>({
  name: (state) => ({
    name: state.name.length >= 2 && assert(isValidName(state.name), 'error.ban_name.name_invalid') ||
    assert(state.name.length <= schema.name.maxLength, 'error.ban_name.name_too_large')
  }),
  description: (state) => ({
    description: assert(state.description.length <= schema.description.maxLength, 'error.ban_name.description_too_large')
  }),
  '*': (state) => ({
    name: (
      assert(state.name.length > 0, 'error.ban_name.name_empty') ||
      assert(state.name.length >= schema.name.minLength, 'error.ban_name.name_too_short') ||
      assert(isValidName(state.name), 'error.ban_name.name_invalid') ||
      assert(state.name.length <= schema.name.maxLength, 'error.ban_name.name_too_large')
    ),
    description: (
      assert(state.description.length > 0, 'error.ban_name.description_empty') ||
      assert(state.description.length >= schema.description.minLength, 'error.ban_name.description_too_short') ||
      assert(state.description.length <= schema.description.maxLength, 'error.ban_name.description_too_large')
    )
  })
})

export default function SubmitBanName() {
  const l = useFormatMessage()
  const [ account, accountState ] = useAuthContext()
  const [ state, editor ] = useEditor(edit, validate, initialPollState)
  const [formDisabled, setFormDisabled] = useState(false);

  useEffect(() => {
    if (state.validated) {
      setFormDisabled(true)
      Promise.resolve()
        .then(async () => {
          let names: string[]
          try {
            names = await Catalyst.get().getBanNames()
          } catch(err) {
            console.log(err)
            throw new Error('error.ban_name.fetching_names')
          }

          if (names.includes(state.value.name.toLowerCase())) {
            throw new Error('error.ban_name.name_already_banned')
          }

          return Governance.get().createProposalBanName(state.value)
        })
        .then((proposal) => {
            loader.proposals.set(proposal.id, proposal)
            navigate(locations.proposal(proposal.id, {new: 'true'}), { replace: true })
        })
        .catch((err) => {
          console.error(err, { ...err })
          editor.error({ '*': err.body?.error || err.message })
          setFormDisabled(false)
        })
    }
  }, [ state.validated ])

  if (accountState.loading) {
    return <Container className="WelcomePage">
      <div>
        <Loader size="huge" active/>
      </div>
    </Container>
  }

  if (!account) {
    return <LogIn
      title={l('page.submit_ban_name.title') || ''}
      description={l('page.submit_ban_name.description') || ''}
    />
  }

  return <ContentLayout small>
    <Head
      title={l('page.submit_ban_name.title') || ''}
      description={l('page.submit_ban_name.description') || ''}
      image="https://decentraland.org/images/decentraland.png"
    />
    <Helmet title={l('page.submit_ban_name.title') || ''} />
    <ContentSection>
      <Header size="huge">{l('page.submit_ban_name.title')}</Header>
    </ContentSection>
    <ContentSection>
      <Paragraph small>{l('page.submit_ban_name.description')}</Paragraph>
    </ContentSection>
    <ContentSection>
      <Label>{l('page.submit_ban_name.name_label')}</Label>
      <Field
        value={state.value.name}
        onChange={(_, { value }) => editor.set({ name: value })}
        onBlur={() => editor.set({ name: state.value.name.trim() })}
        error={!!state.error.name}
        message={
          l.optional(state.error.name) + ' ' +
          l('page.submit.character_counter', {
            current: state.value.name.length,
            limit: schema.name.maxLength
          })
        }
        disabled={formDisabled}
      />
    </ContentSection>
    <ContentSection>
      <Label>
        {l('page.submit_ban_name.description_label')}
        <MarkdownNotice />
      </Label>
      <Paragraph tiny secondary className="details">{l('page.submit_ban_name.description_detail')}</Paragraph>
      <MarkdownTextarea
        minHeight={175}
        value={state.value.description}
        onChange={(_: any, { value }: any) => editor.set({ description: value })}
        onBlur={() => editor.set({ description: state.value.description.trim() })}
        error={!!state.error.description}
        message={
          l.optional(state.error.description) + ' ' +
          l('page.submit.character_counter', {
            current: state.value.description.length,
            limit: schema.description.maxLength
          })
        }
        disabled={formDisabled}
      />
    </ContentSection>
    <ContentSection>
      <Button primary disabled={state.validated} loading={state.validated} onClick={() => editor.validate()}>
        {l('page.submit.button_submit')}
      </Button>
    </ContentSection>
    {state.error['*'] && <ContentSection>
      <Paragraph small primary>{l(state.error['*']) || state.error['*']}</Paragraph>
    </ContentSection>}
  </ContentLayout>
}
