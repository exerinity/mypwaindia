import { utility_classes } from '../../styles/utils.stylex.ts';
import { button_classes } from '../../styles/buttons.stylex.ts';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../components/ui/modal.tsx';
import { ExternalIcon } from '../../components/ui/icons.tsx';

const APK_URL = 'https://mypayindia.com/storage/binaries/26.6.0.apk';

const obtainiumSettings = {
  intermediateLink: [],
  customLinkFilterRegex: '',
  filterByLinkText: false,
  matchLinksOutsideATags: false,
  skipSort: false,
  reverseSort: false,
  sortByLastLinkSegment: false,
  versionExtractWholePage: false,
  requestHeader: [{
    requestHeader: 'User-Agent: Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
  }],
  defaultPseudoVersioningMethod: 'partialAPKHash',
  trackOnly: false,
  versionExtractionRegEx: '([0-9]+(?:\\.[0-9]+)+(?:_[0-9]+)?)',
  matchGroupToUse: '',
  versionDetection: false,
  useVersionCodeAsOSVersion: false,
  apkFilterRegEx: '',
  invertAPKFilter: false,
  autoApkFilterByArch: true,
  appName: 'MyPayIndia',
  appAuthor: 'MyPayIndia Team',
  shizukuPretendToBeGooglePlay: false,
  allowInsecure: false,
  exemptFromBackgroundUpdates: false,
  skipUpdateNotifications: false,
  about: '',
  refreshBeforeDownload: false,
};

const obtainiumConfig = {
  id: 'com.mypayindia.app',
  url: 'https://mypayindia.com/app/android',
  author: 'mypayindia.com',
  name: 'MyPayIndia',
  preferredApkIndex: 0,
  additionalSettings: JSON.stringify(obtainiumSettings),
  overrideSource: 'HTML',
};

const OBTAINIUM_URL = `https://apps.obtainium.imranr.dev/redirect?r=obtainium://app/${encodeURIComponent(JSON.stringify(obtainiumConfig))}`;

export function DownloadSettings() {
  const [androidModalOpen, setAndroidModalOpen] = useState(false);

  return (
    <>
      <p className={`mt-0 mb-0 ${utility_classes.mt_0}`}>
        Download the MyPayIndia app. It's free.
      </p>

      <div className={`btn-row ${button_classes.row} ${utility_classes.row}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <button type="button" className={`option ${button_classes.option}`} onClick={() => setAndroidModalOpen(true)}>
          <span className={`option-label ${button_classes.option_label}`}>Android</span>
        </button>
        <button type="button" className={`option ${button_classes.option}`} disabled>
          <span className={`option-label ${button_classes.option_label}`}>iOS</span>
        </button>
        <Link className={`option ${button_classes.option}`} to="/i/how_pwa">
          <span className={`option-label ${button_classes.option_label}`}>PWA</span>
        </Link>
      </div>

      <Modal
        open={androidModalOpen}
        onClose={() => setAndroidModalOpen(false)}
        title="Select where to download Android app"
      >
        <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}>
          <a className="btn" href={OBTAINIUM_URL} target="_blank" rel="noopener noreferrer">
            Obtanium <ExternalIcon></ExternalIcon>
          </a>
          <a className="btn secondary" href={APK_URL} rel="noopener noreferrer">
            APK
          </a>
        </div>
      </Modal>
    </>
  );
}
