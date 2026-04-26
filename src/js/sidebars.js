const mountApps = () => {
    if (typeof Vue === 'undefined') {
        console.error('Vue is not defined. Make sure vue.js is loaded before sidebars.js');
        return;
    }

    if (window.detailVue || window.infoVue) {
        return;
    }

    const {createApp} = Vue;

    const detailEl = document.querySelector('#detail');
    const infoEl = document.querySelector('#infobar');

    if (detailEl) {
        // Clone the content to use as template before mounting
        const detailTemplate = detailEl.innerHTML;
        
        const detailApp = createApp();
        const detailComponent = {
            template: detailTemplate,
            data() {
                return {
                    item: null,
                    structure: null,
                    page: 0,
                    id: null
                };
            },
            methods: {
                displayPage(page) {
                    canvas.changePage(this.id, page);
                },
                hasData(entry) {
                    return this.getContent(entry) !== '';
                },
                getContent(entry) {
                    if (entry.type === 'text') {
                        return this.item[entry.source];
                    }
                    if (entry.type === 'array') {
                        return this.item[entry.source].join(', ');
                    }
                    if (entry.type === 'keywords') {
                        return this.item[entry.source].join(', ');
                    }
                    if (entry.type === 'markdown') {
                        const markdown = this.item[entry.source];
                        if (markdown) {
                            return marked.parse(markdown, {breaks: true});
                        }
                        return '';
                    }
                    if (entry.type === 'function') {
                        const column = this.item;
                        const func = entry.source;
                        try {
                            return eval(func);
                        } catch (e) {
                            return 'Error';
                        }
                    }
                }
            }
        };

        console.log('Mounting detailApp to #detail');
        // Using a timeout to ensure DOM is settled
        const mountDetail = (retries = 5) => {
            setTimeout(() => {
                try {
                    const el = document.querySelector('#detail');
                    if (el) {
                        window.detailVue = detailApp.mount(detailComponent, '#detail');
                        console.log('detailApp mounted successfully');
                        if (window.pendingDetailData) {
                            window.detailVue.id = window.pendingDetailData.id;
                            window.detailVue.page = window.pendingDetailData.page;
                            window.detailVue.item = window.pendingDetailData.item;
                            delete window.pendingDetailData;
                        }
                    } else if (retries > 0) {
                        console.warn('#detail not found, retrying...', retries);
                        mountDetail(retries - 1);
                    } else {
                        console.error('#detail not found after retries');
                    }
                } catch (e) {
                    console.error('Error during detailApp.mount:', e);
                    if (retries > 0) {
                        console.warn('Retrying mount due to error...', retries);
                        mountDetail(retries - 1);
                    }
                }
            }, 100);
        };
        mountDetail();
    }

    if (infoEl) {
        const infoTemplate = infoEl.innerHTML;
        const infoApp = createApp();
        const infoComponent = {
            template: infoTemplate,
            data() {
                return {
                    info: ""
                };
            },
            methods: {
                marked(input) {
                    if (input) {
                        return marked.parse(input);
                    }
                    return '';
                }
            }
        };

        const mountInfo = (retries = 5) => {
            setTimeout(() => {
                try {
                    const el = document.querySelector('#infobar');
                    if (el) {
                        window.infoVue = infoApp.mount(infoComponent, '#infobar');
                        if (window.pendingInfoText) {
                            window.infoVue.info = window.pendingInfoText;
                            delete window.pendingInfoText;
                        }
                    } else if (retries > 0) {
                        mountInfo(retries - 1);
                    }
                } catch (e) {
                    console.error('Error during infoApp.mount:', e);
                    if (retries > 0) mountInfo(retries - 1);
                }
            }, 100);
        };
        mountInfo();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApps);
} else {
    mountApps();
}
