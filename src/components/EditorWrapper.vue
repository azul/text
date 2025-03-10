<!--
  - @copyright Copyright (c) 2019 Julius Härtl <jus@bitgrid.net>
  -
  - @author Julius Härtl <jus@bitgrid.net>
  -
  - @license GNU AGPL version 3 or any later version
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as
  - published by the Free Software Foundation, either version 3 of the
  - License, or (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program. If not, see <http://www.gnu.org/licenses/>.
  -
  -->

<template>
	<div id="editor-container">
		<div v-if="currentSession && active">
			<p v-if="hasSyncCollission" class="msg icon-error">
				{{ t('text', 'The document has been changed outside of the editor. The changes cannot be applied.') }}
			</p>
			<p v-if="hasConnectionIssue" class="msg icon-info">
				{{ t('text', 'File could not be loaded. Please check your internet connection.') }} <a class="button primary" @click="reconnect">{{ t('text', 'Retry') }}</a>
			</p>
		</div>
		<div v-if="currentSession && active" id="editor-wrapper" :class="{'has-conflicts': hasSyncCollission, 'icon-loading': !initialLoading || hasConnectionIssue, 'richEditor': isRichEditor}">
			<div id="editor">
				<MenuBar v-if="!syncError && !readOnly"
					ref="menubar"
					:editor="tiptap"
					:is-rich-editor="isRichEditor"
					:is-public="isPublic"
					:autohide="autohide">
					<div v-if="currentSession && active" id="editor-session-list">
						<div v-tooltip="lastSavedStatusTooltip" class="save-status" :class="lastSavedStatusClass">
							{{ lastSavedStatus }}
						</div>
						<SessionList :sessions="filteredSessions">
							<GuestNameDialog v-if="isPublic && currentSession.guestName" :sync-service="syncService" />
						</SessionList>
					</div>
					<slot name="header" />
				</MenuBar>
				<div>
					<MenuBubble v-if="!readOnly && isRichEditor" :editor="tiptap" />
					<EditorContent v-show="initialLoading"
						class="editor__content"
						:editor="tiptap" />
				</div>
			</div>
			<ReadOnlyEditor v-if="hasSyncCollission"
				:content="syncError.data.outsideChange"
				:is-rich-editor="isRichEditor" />
		</div>

		<CollisionResolveDialog v-if="hasSyncCollission && !readOnly" @resolveUseThisVersion="resolveUseThisVersion" @resolveUseServerVersion="resolveUseServerVersion" />
	</div>
</template>

<script>
import Vue from 'vue'
import escapeHtml from 'escape-html'

import { SyncService, ERROR_TYPE } from './../services/SyncService'
import { endpointUrl, getRandomGuestName } from './../helpers'
import { extensionHighlight } from '../helpers/mappings'
import { createEditor, markdownit, createMarkdownSerializer, serializePlainText, loadSyntaxHighlight } from './../EditorFactory'

import { EditorContent } from 'tiptap'
import { Collaboration } from 'tiptap-extensions'
import { Keymap } from './../extensions'
import isMobile from './../mixins/isMobile'

import Tooltip from '@nextcloud/vue/dist/Directives/Tooltip'

const EDITOR_PUSH_DEBOUNCE = 200

export default {
	name: 'EditorWrapper',
	components: {
		EditorContent,
		MenuBar: () => import(/* webpackChunkName: "editor-rich" */'./MenuBar'),
		MenuBubble: () => import(/* webpackChunkName: "editor-rich" */'./MenuBubble'),
		ReadOnlyEditor: () => import(/* webpackChunkName: "editor" */'./ReadOnlyEditor'),
		CollisionResolveDialog: () => import(/* webpackChunkName: "editor" */'./CollisionResolveDialog'),
		GuestNameDialog: () => import(/* webpackChunkName: "editor-guest" */'./GuestNameDialog'),
		SessionList: () => import(/* webpackChunkName: "editor-collab" */'./SessionList'),
	},
	directives: {
		Tooltip,
	},
	mixins: [
		isMobile,
	],
	props: {
		initialSession: {
			type: Object,
			default: null,
		},
		relativePath: {
			type: String,
			default: null,
		},
		fileId: {
			type: Number,
			default: null,
		},
		active: {
			type: Boolean,
			default: false,
		},
		autofocus: {
			type: Boolean,
			default: true,
		},
		shareToken: {
			type: String,
			default: null,
		},
		mime: {
			type: String,
			default: null,
		},
		autohide: {
			type: Boolean,
			default: false,
		},
		isDirectEditing: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			tiptap: null,
			/** @type SyncService */
			syncService: null,

			document: null,
			sessions: [],
			currentSession: null,

			filteredSessions: {},

			dirty: false,
			initialLoading: false,
			lastSavedString: '',
			syncError: null,
			hasConnectionIssue: false,
			readOnly: true,
			forceRecreate: false,

			saveStatusPolling: null,
		}
	},
	computed: {
		lastSavedStatus() {
			let status = (this.dirtyStateIndicator ? '*' : '')
			if (!this.isMobile) {
				status += this.lastSavedString
			}
			return status
		},
		lastSavedStatusClass() {
			return this.syncError && this.lastSavedString !== '' ? 'error' : ''
		},
		dirtyStateIndicator() {
			return this.hasUnpushedChanges || this.hasUnsavedChanges
		},
		lastSavedStatusTooltip() {
			let message = t('text', 'Last saved {lastSaved}', { lastSaved: this.lastSavedString })
			if (this.hasSyncCollission) {
				message = t('text', 'The document has been changed outside of the editor. The changes cannot be applied.')
			}
			if (this.hasUnpushedChanges) {
				message += ' - ' + t('text', 'Unpushed changes')
			}
			if (this.hasUnsavedChanges) {
				message += ' - ' + t('text', 'Unsaved changes')
			}
			return { content: message, placement: 'bottom' }
		},
		hasSyncCollission() {
			return this.syncError && this.syncError.type === ERROR_TYPE.SAVE_COLLISSION
		},
		hasUnpushedChanges() {
			return this.dirty
		},
		hasUnsavedChanges() {
			return this.document && this.document.lastSavedVersion < this.document.currentVersion
		},
		backendUrl() {
			return (endpoint) => {
				return endpointUrl(endpoint, !!this.shareToken)
			}
		},
		hasDocumentParameters() {
			return this.fileId || this.shareToken || this.initialSession
		},
		isPublic() {
			return this.isDirectEditing || (document.getElementById('isPublic') && document.getElementById('isPublic').value === '1')
		},
		isRichEditor() {
			return this.mime === 'text/markdown'
		},
		fileExtension() {
			return this.relativePath ? this.relativePath.split('/').pop().split('.').pop() : 'txt'
		},
	},
	watch: {
		lastSavedStatus: function() {
			this.$refs.menubar && this.$refs.menubar.redrawMenuBar()
		},
	},
	mounted() {
		if (this.active && (this.hasDocumentParameters)) {
			this.initSession()
		}
		this.$parent.$emit('update:loaded', true)
	},
	created() {
		this.saveStatusPolling = setInterval(() => {
			this.updateLastSavedStatus()
		}, 2000)
		document.addEventListener('keydown', this._keyUpHandler, true)
	},
	beforeDestroy() {
		this.close()
	},
	methods: {
		async close() {
			document.removeEventListener('keydown', this._keyUpHandler, true)
			clearInterval(this.saveStatusPolling)
			if (this.currentSession && this.syncService) {
				try {
					await this.syncService.close()
					this.currentSession = null
					this.syncService = null
				} catch (e) {
					// Ignore issues closing the session since those might happen due to network issues
				}
			}
			return true
		},
		updateLastSavedStatus() {
			if (this.document) {
				this.lastSavedString = window.moment(this.document.lastSavedVersionTime * 1000).fromNow()
			}
		},
		initSession() {
			if (!this.hasDocumentParameters) {
				this.$parent.$emit('error', 'No valid file provided')
				return
			}
			const guestName = localStorage.getItem('nick') ? localStorage.getItem('nick') : getRandomGuestName()
			this.syncService = new SyncService({
				shareToken: this.shareToken,
				filePath: this.relativePath,
				guestName,
				forceRecreate: this.forceRecreate,
				serialize: (document) => {
					if (this.isRichEditor) {
						const markdown = (createMarkdownSerializer(this.tiptap.nodes, this.tiptap.marks)).serialize(document)
						console.debug('serialized document', { markdown })
						return markdown
					}
					const file = serializePlainText(this.tiptap)
					console.debug('serialized document', { file })
					return file

				},
			})
				.on('opened', ({ document, session }) => {
					this.currentSession = session
					this.document = document
					this.readOnly = document.readOnly
					localStorage.setItem('nick', this.currentSession.guestName)
				})
				.on('change', ({ document, sessions }) => {
					if (this.document.baseVersionEtag !== '' && document.baseVersionEtag !== this.document.baseVersionEtag) {
						this.resolveUseServerVersion()
						return
					}
					this.updateSessions.bind(this)(sessions)
					this.document = document

					this.syncError = null
					this.tiptap.setOptions({ editable: !this.readOnly })

				})
				.on('loaded', ({ documentSource }) => {
					this.hasConnectionIssue = false
					loadSyntaxHighlight(extensionHighlight[this.fileExtension] ? extensionHighlight[this.fileExtension] : this.fileExtension).then((languages) => {
						this.tiptap = createEditor({
							content: this.isRichEditor ? markdownit.render(documentSource) : '<pre>' + escapeHtml(documentSource) + '</pre>',
							onInit: ({ state }) => {
								this.syncService.state = state
								this.syncService.startSync()
							},
							onUpdate: ({ state }) => {
								this.syncService.state = state
							},
							extensions: [
								new Collaboration({
								// the initial version we start with
								// version is an integer which is incremented with every change
									version: this.document.initialVersion,
									clientID: this.currentSession.id,
									// debounce changes so we can save some bandwidth
									debounce: EDITOR_PUSH_DEBOUNCE,
									onSendable: ({ sendable }) => {
										if (this.syncService) {
											this.syncService.sendSteps()
										}
									},
								}),
								new Keymap({
									'Ctrl-s': () => {
										this.syncService.save()
										return true
									},
								}),
							],
							enableRichEditing: this.isRichEditor,
							languages,
						})
						this.tiptap.on('focus', () => {
							this.$emit('focus')
						})
						this.tiptap.on('blur', () => {
							this.$emit('blur')
						})
						this.syncService.state = this.tiptap.state
					})
				})
				.on('sync', ({ steps, document }) => {
					this.hasConnectionIssue = false
					try {
						this.tiptap.extensions.options.collaboration.update({
							version: document.currentVersion,
							steps: steps,
						})
						this.syncService.state = this.tiptap.state
						this.updateLastSavedStatus()
					} catch (e) {
						console.error('Failed to update steps in collaboration plugin', e)
						// TODO: we should recreate the editing session when this happens
					}
					this.document = document
				})
				.on('error', (error, data) => {
					this.tiptap.setOptions({ editable: false })
					if (error === ERROR_TYPE.SAVE_COLLISSION && (!this.syncError || this.syncError.type !== ERROR_TYPE.SAVE_COLLISSION)) {
						this.initialLoading = true
						this.syncError = {
							type: error,
							data: data,
						}
					}
					if (error === ERROR_TYPE.CONNECTION_FAILED && !this.hasConnectionIssue) {
						this.hasConnectionIssue = true
						// FIXME: ideally we just try to reconnect in the service, so we don't loose steps
						OC.Notification.showTemporary('Connection failed, reconnecting')
						if (data.retry !== false) {
							setTimeout(this.reconnect.bind(this), 5000)
						}
					}
					if (error === ERROR_TYPE.SOURCE_NOT_FOUND) {
						this.initialLoading = false
						this.$emit('close')
						this.$emit('error')
					}
				})
				.on('stateChange', (state) => {
					if (state.initialLoading && !this.initialLoading) {
						this.initialLoading = true
						if (this.autofocus) {
							this.tiptap.focus('start')
						}
						this.$emit('ready')
					}
					if (Object.prototype.hasOwnProperty.call(state, 'dirty')) {
						this.dirty = state.dirty
					}
				})
			if (this.initialSession === null) {
				this.syncService.open({
					fileId: this.fileId,
					filePath: this.relativePath,
				}).catch((e) => {
					this.hasConnectionIssue = true
				})
			} else {
				this.syncService.open({
					initialSession: this.initialSession,
				}).catch((e) => {
					this.hasConnectionIssue = true
				})
			}
			this.forceRecreate = false
		},

		resolveUseThisVersion() {
			this.syncService.forceSave()
			this.tiptap.setOptions({ editable: !this.readOnly })
		},

		resolveUseServerVersion() {
			this.forceRecreate = true
			this.reconnect()
		},

		reconnect() {
			if (this.syncService) {
				this.syncService.close().then(() => {
					this.syncService = null
					this.tiptap.destroy()
					this.initSession()
				}).catch((e) => {
					// Ignore issues closing the session since those might happen due to network issues
				})
			} else {
				this.syncService = null
				this.tiptap.destroy()
				this.initSession()
			}
		},

		updateSessions(sessions) {
			this.sessions = sessions.sort((a, b) => b.lastContact - a.lastContact)
			const currentSessionIds = this.sessions.map((session) => session.userId)
			const currentGuestIds = this.sessions.map((session) => session.guestId)

			const removedSessions = Object.keys(this.filteredSessions)
				.filter(sessionId => !currentSessionIds.includes(sessionId) && !currentGuestIds.includes(sessionId))

			for (const index in removedSessions) {
				Vue.delete(this.filteredSessions, removedSessions[index])
			}
			for (const index in this.sessions) {
				const session = this.sessions[index]
				const sessionKey = session.displayName ? session.userId : session.id
				if (this.filteredSessions[sessionKey]) {
					// update timestamp if relevant
					if (this.filteredSessions[sessionKey].lastContact < session.lastContact) {
						Vue.set(this.filteredSessions[sessionKey], 'lastContact', session.lastContact)
					}
				} else {
					Vue.set(this.filteredSessions, sessionKey, session)
				}
				if (session.id === this.currentSession.id) {
					Vue.set(this.filteredSessions[sessionKey], 'isCurrent', true)
				}
			}
		},
		_keyUpHandler(event) {
			const key = event.key || event.keyCode
			if ((event.ctrlKey || event.metaKey) && !event.shiftKey && (key === 'f' || key === 70)) {
				event.stopPropagation()
				return true
			}
		},
	},
}
</script>

<style scoped lang="scss">
	#editor-container {
		display: block;
		width: 100%;
		max-width: 100%;
		height: 100%;
		left: 0;
		top: 50px;
		margin: 0 auto;
		position: relative;
		background-color: var(--color-main-background);
	}

	#editor-wrapper {
		display: flex;
		width: 100%;
		height: 100%;
		overflow: hidden;
		position: absolute;
		.ProseMirror {
			margin-top: 0 !important;
		}
		&.icon-loading {
			#editor {
				opacity: 0.3;
			}
		}
	}

	#editor, .editor {
		background: var(--color-main-background);
		color: var(--color-main-text);
		background-clip: padding-box;
		border-radius: var(--border-radius);
		padding: 0;
		position: relative;
		overflow-y: auto;
		overflow-x: hidden;
		width: 100%;
	}

	.msg.icon-error {
		padding: 12px;
		border-bottom:1px solid var(--color-border);
		padding-left: 30px;
		background-position: 8px center;
	}

	.save-status {
		padding: 9px;
		text-overflow: ellipsis;
		color: var(--color-text-lighter);

		&.error {
			background-color: var(--color-error);
			color: var(--color-main-background);
			border-radius: 3px;
		}
	}

	#editor-container #editor-wrapper.has-conflicts {
		height: calc(100% - 50px);

		#editor, #read-only-editor {
			width: 50%;
			height: 100%;
		}
	}

	#editor-session-list {
		padding: 4px 16px 4px 4px;
		display: flex;

		input, div {
			vertical-align: middle;
			margin-left: 3px;
		}
	}

	.editor__content {
		max-width: 670px;
		margin: auto;
		position: relative;
	}

	#body-public {
		height: auto;
	}

	#files-public-content {
		height: auto;
		#editor-wrapper {
			position: relative;
		}
		#editor-container {
			top: 0;
			width: 100%;

			#editor::v-deep .menubar {
				// sticky position is not working as body is our scroll container
				position: fixed;
				top: 50px;
				width: 100%;
			}

			#editor {
				padding-top: 50px;
				overflow: auto;
			}
			.has-conflicts #editor {
				padding-top: 0px;
			}
		}
	}

	.ie {
		#editor::v-deep .menubar {
			// sticky position is not working as body is our scroll container
			position: fixed;
			top: 50px;
			width: 100%;
		}
		.editor__content::v-deep .ProseMirror {
			padding-top: 50px;
		}
	}

</style>
<style lang="scss">
	@import './../../css/style';

	#editor-wrapper {
		@import './../../css/prosemirror';

		&:not(.richEditor) .ProseMirror {
			pre {
				background-color: var(--color-main-background);

				&::before {
					content: attr(data-language);
					text-transform: uppercase;
					display: block;
					text-align: right;
					font-weight: bold;
					font-size: 0.6rem;
				}
				code {
					.hljs-comment,
					.hljs-quote {
						color: #999999;
					}
					.hljs-variable,
					.hljs-template-variable,
					.hljs-attribute,
					.hljs-tag,
					.hljs-name,
					.hljs-regexp,
					.hljs-link,
					.hljs-selector-id,
					.hljs-selector-class {
						color: #f2777a;
					}
					.hljs-number,
					.hljs-meta,
					.hljs-built_in,
					.hljs-builtin-name,
					.hljs-literal,
					.hljs-type,
					.hljs-params {
						color: #f99157;
					}
					.hljs-string,
					.hljs-symbol,
					.hljs-bullet {
						color: #99cc99;
					}
					.hljs-title,
					.hljs-section {
						color: #ffcc66;
					}
					.hljs-keyword,
					.hljs-selector-tag {
						color: #6699cc;
					}
					.hljs-emphasis {
						font-style: italic;
					}
					.hljs-strong {
						font-weight: 700;
					}
				}
			}
		}
	}
</style>
