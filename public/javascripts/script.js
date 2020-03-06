let teams = {
  teamA: null,
  teamB: null,
};

jQuery(document).ready(function($) {
  $(document).on('change', 'select.team-picker', function(evt) {
    teamPick($(evt.target));
  });
  $(document).on('change', 'input[name=site-picker]', function() {
    if (teams.teamB && teams.teamA) {
      $.get({
        url: '/predict/' + $('.team-picker.teamA').val() + '/' + $('.team-picker.teamB').val() + '/' + ($('input[name=site-picker]:checked').val() == 'a' ? 'home' : $('input[name=site-picker]:checked').val() == 'b' ? 'road' : 'neutral')
      }).then( prediction => {
        $('.team-prediction.teamA').html(prediction.rendered);
      });
      $.get({
        url: '/predict/' + $('.team-picker.teamB').val() + '/' + $('.team-picker.teamA').val() + '/' + ($('input[name=site-picker]:checked').val() == 'b' ? 'home' : $('input[name=site-picker]:checked').val() == 'a' ? 'road' : 'neutral')
      }).then( prediction => {
        $('.team-prediction.teamB').html(prediction.rendered);
      });
    }
  })
  $(document).on('click', 'a.refreshData', function(e) {
    e.preventDefault();
    $.get({
      url: '/refreshData'
    }).then(result => {
      if (result.success) {
        if ($('select.team-picker.teamA').val() != -1) {
          teamPick($('select.team-picker.teamA'));
        } else if ($('select.team-picker.teamB').val() != -1) {
          teamPick($('select.team-picker.teamB'));
        }
        $('.metadata').html(result.html);
      }
    }).then( () => {
      $.get({
        url: '/teamList'
      }).then(result => {
        $('select.team-picker').html(result.html);
      })
    })
  })

});

function teamPick(el) {
  if (el.val() == -1) {
    return;
  }
  $.get({
    url: '/teamData/' + el.val(),
  }).then( response => {
    let team = whichTeam(el);
    teams[team] = response.team;
    $('.team-data.'+team).html(response.rendered);
    // if both teams are set, run prediction
    if (teams.teamB && teams.teamA) {
      $.get({
        url: '/predict/' + $('.team-picker.teamA').val() + '/' + $('.team-picker.teamB').val() + '/' + ($('input[name=site-picker]:checked').val() == 'a' ? 'home' : $('input[name=site-picker]:checked').val() == 'b' ? 'road' : 'neutral')
      }).then( prediction => {
        $('.team-prediction.teamA').html(prediction.rendered);
      });
      $.get({
        url: '/predict/' + $('.team-picker.teamB').val() + '/' + $('.team-picker.teamA').val() + '/' + ($('input[name=site-picker]:checked').val() == 'b' ? 'home' : $('input[name=site-picker]:checked').val() == 'a' ? 'road' : 'neutral')
      }).then( prediction => {
        $('.team-prediction.teamB').html(prediction.rendered);
      });
    }
  });
}

function whichTeam(el) {
  if (el.attr('class').indexOf('teamA') >= 0) {
    if (el.attr('class').indexOf('teamB') >= 0) { // we have a problem
      throw new Error('ambiguous class definition of element');
    } else {
      return 'teamA';
    }
  } else {
    if (el.attr('class').indexOf('teamB') >= 0) {
      return 'teamB';
    }
    else {
      return null;
    }
  }
}
