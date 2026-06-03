import { Octokit } from 'octokit';
import { decrypt } from './encryption';
import { createClient } from './supabase/server';

export async function createGitHubClient(userId: string) {
  const supabase = await createClient();
  
  const { data: userConfig, error } = await supabase
    .from('user_configs')
    .select('github_tokens')
    .eq('user_id', userId)
    .single();
    
  if (error || !userConfig?.github_tokens) {
    throw new Error('GitHub not connected');
  }
  
  const tokens = JSON.parse(decrypt(userConfig.github_tokens));
  
  const octokit = new Octokit({
    auth: tokens.access_token,
  });
  
  return {
    octokit,
    async createBranch(owner: string, repo: string, branchName: string, baseBranch: string = 'main') {
      const { data: baseRef } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`,
      });
      
      return octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.object.sha,
      });
    }
  };
}
