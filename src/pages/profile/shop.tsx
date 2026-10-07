import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { usePageTitle } from '../../hooks/page_title.ts';
import { ProfileShop } from '../../components/shop/storefront.tsx';
import { utility_classes } from '../../styles/utils.stylex.ts';
import { profile_path } from '../../utils/profiles.ts';

export default function ProfileShopPage() {
  const { username } = useParams();
  const { active } = useAuth();
  if (!username) return null;
  return <ProfileStorefront key={`${username}:${active?.env}:${active?.token}`} username={username} />;
}

function ProfileStorefront({ username }: { username: string }) {
  usePageTitle(`@${username}'s shop`);
  const { active } = useAuth();
  const auth = active ? { token: active.token, env: active.env } : undefined;
  const owner = active?.username.toLowerCase() === username.toLowerCase();
  return <main>
    <div className={`row ${utility_classes.row} ${utility_classes.spread} ${utility_classes.mb_2}`}>
      <h1 className={`mt-0 ${utility_classes.mt_0}`}>@{username}'s shop</h1>
      <div className={`row ${utility_classes.row} ${utility_classes.gap_md}`}>
        {owner && <Link className="btn secondary" to="/account/shop">Manage shop</Link>}
        <Link className="btn secondary" to={profile_path(username)}>Back to profile</Link>
      </div>
    </div>
    <ProfileShop username={username} auth={auth} owner={owner} show_manage_link={false} />
  </main>;
}
