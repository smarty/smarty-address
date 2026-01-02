import SmartyAddress from './index';

describe('SmartyAddress', () => {
  it('should create a new instance', () => {
    const config = {
      key: 'test-key',
      targetElement: document.createElement('div'),
    };

    const instance = new SmartyAddress(config);

    expect(instance).toBeInstanceOf(SmartyAddress);
  });
});
