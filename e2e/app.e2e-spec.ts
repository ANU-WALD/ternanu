import { TernDataViewerPage } from './app.po';

describe('tern-data-viewer App', () => {
  let page: TernDataViewerPage;

  beforeEach(() => {
    page = new TernDataViewerPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
